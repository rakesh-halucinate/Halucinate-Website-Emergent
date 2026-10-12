import os
import re
from typing import Dict, Optional
from pathlib import Path


class OpenAISpeechToText:
    """
    Speech-to-Text integration using OpenAI's transcription models via LiteLLM.
    Supports both direct OpenAI API keys and Emergent LLM key through proxy.
    """

    # Supported models
    MODELS = ["whisper-1", "gpt-4o-mini-transcribe", "gpt-4o-transcribe"]

    # Supported response formats, per model. openai 1.99.9 documents json as the
    # only format the gpt-4o transcribe models accept.
    RESPONSE_FORMATS = {
        "whisper-1": ["json", "text", "srt", "verbose_json", "vtt"],
        "gpt-4o-mini-transcribe": ["json"],
        "gpt-4o-transcribe": ["json"],
    }

    # Models that return per-segment confidence fields (no_speech_prob, avg_logprob)
    # through this SDK. The gpt-4o models do expose logprobs via include=["logprobs"],
    # but litellm 1.80.0 drops that field when it builds TranscriptionResponse
    # (convert_dict_to_response.py copies language/task/duration/words/segments only),
    # so a confidence-based guard is only reachable on whisper-1 here.
    MODELS_WITH_SEGMENTS = ["whisper-1"]

    # Supported file formats
    FILE_FORMATS = ["mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"]

    # Maximum file size in bytes (25 MB)
    MAX_FILE_SIZE = 25 * 1024 * 1024

    # Dated snapshot suffix, e.g. gpt-4o-mini-transcribe-2025-03-20
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

    def __init__(self, api_key: str, custom_headers: Dict[str, str] = None):
        """
        Initialize the STT client.

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

    def _validate_audio_file(self, file) -> None:
        """
        Validate audio file format and size.

        Args:
            file: Audio file object or path

        Raises:
            ValueError: If file validation fails
        """
        # Check if file is a path string
        if isinstance(file, (str, Path)):
            file_path = Path(file)

            # Check if file exists
            if not file_path.exists():
                raise ValueError(f"File not found: {file}")

            # Check file size
            file_size = file_path.stat().st_size
            if file_size > self.MAX_FILE_SIZE:
                raise ValueError(
                    f"File size ({file_size} bytes) exceeds maximum allowed size "
                    f"({self.MAX_FILE_SIZE} bytes / 25 MB)"
                )

            # Check file format
            file_extension = file_path.suffix.lstrip('.').lower()
            if file_extension not in self.FILE_FORMATS:
                raise ValueError(
                    f"Unsupported file format: {file_extension}. "
                    f"Supported formats: {', '.join(self.FILE_FORMATS)}"
                )
        # If file is a file object, check if it has a name attribute
        elif hasattr(file, 'name'):
            # Check file size if possible
            if hasattr(file, 'seek') and hasattr(file, 'tell'):
                current_pos = file.tell()
                file.seek(0, 2)  # Seek to end
                file_size = file.tell()
                file.seek(current_pos)  # Reset to original position
                
                if file_size > self.MAX_FILE_SIZE:
                    raise ValueError(
                        f"File size ({file_size} bytes) exceeds maximum allowed size "
                        f"({self.MAX_FILE_SIZE} bytes / 25 MB)"
                    )
            
            # Check file format
            file_extension = Path(file.name).suffix.lstrip('.').lower()
            if file_extension and file_extension not in self.FILE_FORMATS:
                raise ValueError(
                    f"Unsupported file format: {file_extension}. "
                    f"Supported formats: {', '.join(self.FILE_FORMATS)}"
                )

    async def transcribe(
        self,
        file,
        model: str = "whisper-1",
        response_format: str = "json",
        prompt: Optional[str] = None,
        language: Optional[str] = None,
        temperature: Optional[float] = None,
        timestamp_granularities: Optional[list] = None
    ):
        """
        Transcribe audio into the language of the input audio.

        Args:
            file: Audio file object or path (mp3, mp4, mpeg, mpga, m4a, wav, webm)
            model: Model to use ('whisper-1', 'gpt-4o-mini-transcribe' or
                'gpt-4o-transcribe'). gpt-4o-mini-transcribe is faster and cheaper
                than whisper-1, and returned empty on all 5 silent test clips where
                whisper-1 invented text, but it returns no segments, so a
                no_speech_prob guard is not possible with it.
            response_format: Format of transcript output
            prompt: Optional text to guide the model's style
            language: Language of the input audio (ISO-639-1 format)
            temperature: Sampling temperature between 0 and 1
            timestamp_granularities: Timestamp granularities (whisper-1 + verbose_json only)

        Returns:
            Transcription response object

        Raises:
            ValueError: If validation fails
            Exception: If transcription fails
        """
        try:
            # Validate file
            self._validate_audio_file(file)

            # Validate the response format only for models whose capabilities we know.
            # An unrecognised name goes to the API, which is authoritative about it.
            base_model = self._base_model(model)
            known_formats = self.RESPONSE_FORMATS.get(base_model) if base_model else None
            if known_formats is not None and response_format not in known_formats:
                raise ValueError(
                    f"Invalid response_format '{response_format}' for model '{model}'. "
                    f"Supported formats: {known_formats}"
                )

            # Validate timestamp_granularities
            if timestamp_granularities and response_format != "verbose_json":
                raise ValueError("timestamp_granularities requires response_format='verbose_json'")

            # Prepare parameters for litellm.transcription()
            params = {
                "model": f"openai/{model}",
                "file": file,
                "api_key": self.api_key,
                "response_format": response_format,
            }

            # Add optional parameters
            if prompt:
                params["prompt"] = prompt

            if language:
                params["language"] = language

            if temperature is not None:
                if temperature < 0 or temperature > 1:
                    raise ValueError("Temperature must be between 0 and 1")
                params["temperature"] = temperature

            if timestamp_granularities:
                params["timestamp_granularities"] = timestamp_granularities

            # If using Emergent key, configure proxy
            if self._is_emergent_key(self.api_key):
                params["api_base"] = self.emergent_proxy_url
                params["custom_llm_provider"] = "openai"

                # Add custom headers when using Emergent proxy
                if self.custom_headers:
                    params["extra_headers"] = self.custom_headers

            # Transcribe using litellm
            from litellm import atranscription
            response = await atranscription(**params)

            return response

        except ValueError as ve:
            raise ValueError(f"Validation error: {str(ve)}")
        except Exception as e:
            raise Exception(f"Failed to transcribe audio: {str(e)}")
