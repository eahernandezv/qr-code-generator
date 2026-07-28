import os
import json
import subprocess
import sys
import unittest
from unittest.mock import patch

import provider_generative as provider


class ProviderBoundaryTests(unittest.TestCase):
    def test_direct_token_is_explicit_and_supported(self):
        with patch.dict(os.environ, {"REPLICATE_API_TOKEN": "token-for-test"}, clear=False):
            self.assertEqual(provider._get_vault_token(), "token-for-test")

    def test_provider_candidate_withholds_export_until_core_validation(self):
        engine = provider.ReplicateProvider(token="test")
        result = {
            "output": ["https://example.invalid/generated.png"],
            "metrics": {"predict_time": 3.2},
        }
        with patch.object(provider, "_download_image_data_url", return_value="data:image/png;base64,AA=="):
            candidate = engine._build_candidate(
                "00000000-0000-4000-8000-000000000001",
                "00000000-0000-4000-8000-000000000002",
                0,
                provider.MODEL_ZYLIM,
                result,
                "https://example.com",
            )
        self.assertFalse(candidate.exportAllowed)
        self.assertFalse(candidate.scanResults[0].pass_)
        self.assertEqual(candidate.scanResults[0].decoder, "pending-core-validation")
        self.assertTrue(candidate.rendered.data.startswith("data:image/png;base64,"))

    def test_active_prediction_cancellation_calls_provider(self):
        provider._ACTIVE_PREDICTION = ("prediction-test", "token-test")
        with patch.object(provider, "_replicate_api", return_value={}) as api:
            provider._cancel_active_prediction()
        api.assert_called_once_with("POST", "/predictions/prediction-test/cancel", "token-test", timeout=8)
        self.assertIsNone(provider._ACTIVE_PREDICTION)

    def test_destination_requires_normalized_canonical_payload(self):
        engine = provider.ReplicateProvider(token="test")
        expected = "https://example.com/Exact?Case=Preserved"
        self.assertEqual(
            engine._extract_url({"normalizedPayload": {"canonical": expected}, "prompt": "https://attacker.invalid"}),
            expected,
        )
        for malformed in (
            {},
            {"prompt": "https://attacker.invalid"},
            {"normalizedPayload": {}},
            {"normalizedPayload": {"canonical": ""}},
        ):
            with self.subTest(malformed=malformed):
                with self.assertRaises(ValueError):
                    engine._extract_url(malformed)

    def test_provider_api_error_string_redacts_response_body(self):
        error = provider.ReplicateAPIError(400, "Bad Request", "secret response and destination")
        self.assertNotIn("secret response", str(error))
        self.assertEqual(str(error), "Replicate API 400 Bad Request")

    def test_cli_errors_use_nonzero_exit_and_stderr_not_contract_stdout(self):
        result = subprocess.run(
            [sys.executable, provider.__file__],
            input="not-json",
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(result.stdout, "")
        self.assertIn("Invalid JSON", json.loads(result.stderr)["error"])


if __name__ == "__main__":
    unittest.main()
