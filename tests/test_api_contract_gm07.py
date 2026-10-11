import re
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class ApiContractGM07Tests(unittest.TestCase):
    def setUp(self):
        self.contracts_path = ROOT / 'mobile/src/data/api/contracts.ts'
        self.client_path = ROOT / 'mobile/src/data/api/client.ts'
        self.mock_path = ROOT / 'mobile/src/data/api/mock.ts'
        self.index_path = ROOT / 'mobile/src/data/api/index.ts'
        self.test_unit_path = ROOT / 'mobile/tests/unit/apiContract.test.ts'
        self.api_contract_spec_path = ROOT / 'docs/architecture/API_CONTRACT.md'
        self.core_schema_path = ROOT / 'supabase/migrations/0001_core_schema.sql'

    def test_artifacts_exist(self):
        for path in [
            self.contracts_path,
            self.client_path,
            self.mock_path,
            self.index_path,
            self.test_unit_path,
            self.api_contract_spec_path,
            self.core_schema_path,
        ]:
            self.assertTrue(path.exists(), f'Missing required artifact: {path}')

    def test_contracts_cover_all_api_contract_error_codes(self):
        content = self.contracts_path.read_text(encoding='utf-8')
        
        # Explicit error list from API_CONTRACT.md
        expected_errors = [
            'AUTH_REQUIRED',
            'INVALID_INPUT',
            'ROOM_NOT_FOUND',
            'ROOM_FULL',
            'ROOM_LOCKED',
            'ROOM_EXPIRED',
            'NOT_MEMBER',
            'NOT_HOST',
            'NOT_READY',
            'INCOMPLETE_BALLOT',
            'INVALID_DISH',
            'ALREADY_SUBMITTED',
            'VERSION_CONFLICT',
            'REQUEST_ID_REUSED',
            'RATE_LIMITED',
            'ROOM_TERMINAL',
            'INVITE_EXPIRED',
            'INVITE_REJECTED',
            'NOT_PARTNER',
            'CONSENT_REQUIRED',
            'OUT_OF_COVERAGE',
            'NO_ELIGIBLE_FOOD',
            'AVAILABILITY_UNKNOWN',
            'CONTEXT_CHANGED',
            'DESIRED_TIME_PASSED',
        ]

        for err in expected_errors:
            self.assertIn(f"'{err}'", content, f"ErrorCode '{err}' missing in contracts.ts")

    def test_contracts_cover_core_endpoints(self):
        content = self.contracts_path.read_text(encoding='utf-8')
        
        expected_methods = [
            'createGuestSession',
            'restoreSession',
            'logout',
            'getDiscoveryContext',
            'previewFoodPool',
            'createRoom',
            'joinRoom',
            'getRoomSnapshot',
            'updatePreferences',
            'updateContext',
            'setReady',
            'startRound',
            'leaveRoom',
            'cancelRoom',
            'submitBallot',
            'getResultOfferings',
            'listFriends',
            'invitePartner',
            'acceptPartner',
            'rejectPartner',
            'unfriend',
            'inviteToRoom',
            'acceptRoomInvite',
            'listPartnerInbox',
            'registerPushDevice',
            'unregisterPushDevice',
            'getHistory',
            'updateHistoryConsent',
            'deleteHistory',
        ]

        for method in expected_methods:
            self.assertIn(method, content, f"Method '{method}' missing in ApiClient interface")

    def test_client_implements_all_methods_and_idempotency(self):
        content = self.client_path.read_text(encoding='utf-8')
        self.assertIn('class ApiClientImpl implements ApiClient', content)
        self.assertIn('generateRequestId', content)
        self.assertIn('mapError', content)
        self.assertIn('FetchTransport', content)
        self.assertIn('setAuthToken', content)
        self.assertIn('getAuthToken', content)

    def test_mock_implements_all_modes_and_state_mutations(self):
        content = self.mock_path.read_text(encoding='utf-8')
        self.assertIn('class MockApiClient implements ApiClient', content)
        self.assertIn("'default'", content)
        self.assertIn("'loading'", content)
        self.assertIn("'empty'", content)
        self.assertIn("'error'", content)
        self.assertIn("'expired'", content)
        self.assertIn("'stale'", content)
        self.assertIn('MOCK_ANCHORS', content)
        self.assertIn('MOCK_DISHES', content)

    def test_index_exports_factory(self):
        content = self.index_path.read_text(encoding='utf-8')
        self.assertIn('export function createApiClient', content)
        self.assertIn("mode: ApiMode = 'mock'", content)


if __name__ == '__main__':
    unittest.main()
