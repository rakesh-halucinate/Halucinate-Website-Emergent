import os
import re
from typing import Dict, Optional
import base64


class OpenAITextToSpeech:
    """
    Text-to-Speech integration using OpenAI's TTS models via LiteLLM.
    Supports both direct OpenAI API keys and Emergent LLM key through proxy.
    """

    # Supported models
    MODELS = ["tts-1", "tts-1-hd", "gpt-4o-mini-tts"]

    # Voices every supported model accepts (9 voices)
    VOICES = ["alloy", "ash", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"]

    # Voices only certain models accept, on top of VOICES
    EXTRA_VOICES = {"gpt-4o-mini-tts": ["ballad", "verse"]}

    # Models whose voice set changes often; voices are left to the API to validate.
    OPEN_VOICE_MODELS = ["gpt-4o-mini-tts"]

    # Models that accept the `instructions` steering parameter. Sending it to any
    # other model is rejected by the API, so it is validated rather than dropped.
    INSTRUCTION_MODELS = ["gpt-4o-mini-tts"]

    # Dated snapshot suffix, e.g. gpt-4o-mini-tts-2025-03-20
    _SNAPSHOT_SUFFIX = re.compile(r"-\d{4}-\d{2}-\d{2}$")

    @classmethod
    def _base_model(cls, model: str) -> Optional[str]:
        """The known model whose capabilities apply, or None if we cannot tell.

        A dated snapshot resolves to its base model. Anything else returns None and
        skips model-specific validation so new or unrecognised models reach the API
        instead of being rejected here.
        """
        if model in cls.MODELS:
            return model
        base = cls._SNAPSHOT_SUFFIX.sub("", model)
        return base if base in cls.MODELS else None

    # Supported formats (6 formats available)
    FORMATS = ["mp3", "opus", "aac", "flac", "wav", "pcm"]

    def __init__(self, api_key: str, custom_headers: Dict[str, str] = None):
        """
        Initialize the TTS client.

        Args:
            api_key: OpenAI API key or Emergent LLM key (starts with 'sk-emergent-')
            custom_headers: Custom headers to include in requests
        """
        self.api_key = api_key
        proxy_url = os.getenv("INTEGRATION_PROXY_URL", "https://integrations.emergentagent.com")
        self.emergent_proxy_url = proxy_url + "/llm"
        self.custom_headers = custom_headers or {}

        app_url = os.getenv('APP_URL')
        if app_url:
            self.custom_headers['X-App-ID'] = app_url

    def _is_emergent_key(self, api_key: str) -> bool:
        """Check if the API key is an Emergent LLM key."""
        return api_key.startswith("sk-emergent-")

    @classmethod
    def voices_for(cls, model: str) -> list:
        """Return the voices valid for a given model."""
        return cls.VOICES + cls.EXTRA_VOICES.get(model, [])

    async def generate_speech(
        self,
        text: str,
        model: str = "tts-1",
        voice: str = "alloy",
        speed: float = 1.0,
        response_format: str = "mp3",
        instructions: Optional[str] = None
    ) -> bytes:
        """
        Generate speech audio from text using OpenAI's TTS models.

        Args:
            text: The text to convert to speech (max 4096 characters)
            model: The TTS model to use ('tts-1', 'tts-1-hd' or 'gpt-4o-mini-tts')
            voice: The voice to use. All models accept alloy, ash, coral, echo, fable,
                nova, onyx, sage and shimmer; gpt-4o-mini-tts also accepts ballad and
                verse, and its voice is not checked locally so newer voices reach the
                API. See voices_for(model).
            speed: Speed of the generated audio (0.25 to 4.0). openai 1.99.9 documents
                this range with no model-specific exception, but we have not verified
                it on gpt-4o-mini-tts — prefer describing the pace in `instructions`
                there.
            response_format: Audio format (mp3, opus, aac, flac, wav, pcm)
            instructions: Delivery direction for gpt-4o-mini-tts, e.g. "Speak slowly in
                a warm, reassuring tone." Only gpt-4o-mini-tts accepts this; passing it
                with another model raises ValueError.

        Returns:
            bytes: Generated audio data as bytes

        Raises:
            ValueError: If validation fails
            Exception: If speech generation fails
        """
        try:
            # Validate inputs
            if not text or len(text.strip()) == 0:
                raise ValueError("Text cannot be empty")

            if len(text) > 4096:
                raise ValueError("Text must be 4096 characters or less")

            # Validate voices and instructions only for models whose capabilities we
            # know. An unrecognised name goes to the API, which is authoritative.
            base_model = self._base_model(model)
            if base_model is not None:
                allowed_voices = self.voices_for(base_model)
                if base_model not in self.OPEN_VOICE_MODELS and voice not in allowed_voices:
                    raise ValueError(f"Invalid voice: {voice} for model {model}. Must be one of {allowed_voices}")

                if instructions and base_model not in self.INSTRUCTION_MODELS:
                    raise ValueError(
                        f"instructions is only supported on {self.INSTRUCTION_MODELS}, not {model}"
                    )

            if speed < 0.25 or speed > 4.0:
                raise ValueError("Speed must be between 0.25 and 4.0")

            if response_format not in self.FORMATS:
                raise ValueError(f"Invalid format: {response_format}. Must be one of {self.FORMATS}")

            # Prepare parameters for litellm.speech()
            params = {
                "model": f"openai/{model}",
                "input": text,
                "voice": voice,
                "api_key": self.api_key,
            }

            # Add optional parameters
            if speed != 1.0:
                params["speed"] = speed

            if response_format != "mp3":
                params["response_format"] = response_format

            if instructions:
                params["instructions"] = instructions

            # If using Emergent key, configure proxy
            if self._is_emergent_key(self.api_key):
                params["api_base"] = self.emergent_proxy_url
                params["custom_llm_provider"] = "openai"

                # Add custom headers when using Emergent proxy
                if self.custom_headers:
                    params["extra_headers"] = self.custom_headers

            # aspeech, not speech: this method is async, and the sync call blocks
            # the caller's event loop for the length of the request.
            from litellm import aspeech
            response = await aspeech(**params)

            # The response is a HttpxBinaryResponseContent object
            # Read the content as bytes
            if hasattr(response, 'content'):
                return response.content
            elif hasattr(response, 'read'):
                return response.read()
            else:
                # Fallback: try to get bytes directly
                return bytes(response)

        except ValueError as ve:
            raise ValueError(f"Validation error: {str(ve)}")
        except Exception as e:
            raise Exception(f"Failed to generate speech: {str(e)}")

    async def generate_speech_base64(
        self,
        text: str,
        model: str = "tts-1",
        voice: str = "alloy",
        speed: float = 1.0,
        response_format: str = "mp3",
        instructions: Optional[str] = None
    ) -> str:
        """
        Generate speech and return as base64 encoded string.
        Useful for embedding audio in JSON responses.

        Args:
            text: The text to convert to speech
            model: The TTS model to use ('tts-1', 'tts-1-hd' or 'gpt-4o-mini-tts')
            voice: The voice to use (see voices_for(model))
            speed: Speed of the generated audio
            response_format: Audio format
            instructions: Delivery direction, gpt-4o-mini-tts only

        Returns:
            str: Base64 encoded audio data
        """
        audio_bytes = await self.generate_speech(
            text=text,
            model=model,
            voice=voice,
            speed=speed,
            response_format=response_format,
            instructions=instructions
        )
        return base64.b64encode(audio_bytes).decode('utf-8')
