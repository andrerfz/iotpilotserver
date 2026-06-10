Feature: User Management

  # ── Registration ─────────────────────────────────────────────────────────────

  Scenario Outline: Register a new user
    When I register user "<email>" with username "<username>" password "<password>"
    Then the user "<email>" has role "<expected_role>"
    And the user "<email>" has status "<expected_status>"

    Examples:
      | email                    | username | password       | expected_role | expected_status |
      | alice@acceptance-bc.test | alice    | SecurePass123! | USER          | ACTIVE          |
      | bob@acceptance-bc.test   | bob      | SecurePass123! | USER          | ACTIVE          |

  # ── Authentication ────────────────────────────────────────────────────────────

  Scenario Outline: Authenticate an existing user creates a session
    Given a user "<email>" with username "<username>" password "<password>" exists
    When I authenticate as "<email>" with password "<password>"
    Then a session exists for user "<email>"
    And the session expires within "<max_expiry_minutes>" minutes

    Examples:
      | email                    | username | password       | max_expiry_minutes |
      | carol@acceptance-bc.test | carol    | SecurePass123! | 490                |

  # ── Session timeout preference ────────────────────────────────────────────────

  Scenario Outline: Session timeout respects user preference
    Given a user "<email>" with username "<username>" password "<password>" exists
    And the user "<email>" has preference category "<pref_category>" key "<pref_key>" value "<pref_value>"
    When I authenticate as "<email>" with password "<password>"
    Then a session exists for user "<email>"
    And the session expires within "<max_expiry_minutes>" minutes

    Examples:
      | email                   | username | password       | pref_category | pref_key      | pref_value | max_expiry_minutes |
      | dave@acceptance-bc.test | dave     | SecurePass123! | SECURITY      | sessionTimeout | 60         | 62                 |
      | eve@acceptance-bc.test  | eve      | SecurePass123! | SECURITY      | sessionTimeout | 120        | 122                |

  # ── User preferences ──────────────────────────────────────────────────────────

  Scenario Outline: Save and retrieve a user preference
    Given a user "<email>" with username "<username>" password "<password>" exists
    When I save preference category "<pref_category>" key "<pref_key>" value "<pref_value>" for user "<email>"
    Then the user "<email>" preference category "<pref_category>" key "<pref_key>" equals "<expected_value>"

    Examples:
      | email                    | username | password       | pref_category | pref_key          | pref_value | expected_value |
      | frank@acceptance-bc.test | frank    | SecurePass123! | SYSTEM        | theme             | dark       | dark           |
      | grace@acceptance-bc.test | grace    | SecurePass123! | SYSTEM        | itemsPerPage      | 25         | 25             |
      | henry@acceptance-bc.test | henry    | SecurePass123! | NOTIFICATIONS | alertNotifications | false      | false          |
      | iris@acceptance-bc.test  | iris     | SecurePass123! | SECURITY      | sessionTimeout    | 60         | 60             |

  # ── Logout ────────────────────────────────────────────────────────────────────

  Scenario Outline: Logout revokes the active session
    Given a user "<email>" with username "<username>" password "<password>" exists
    And the user "<email>" has an active session
    When I log out user "<email>"
    Then no active session exists for user "<email>"

    Examples:
      | email                   | username | password       |
      | jane@acceptance-bc.test | jane     | SecurePass123! |
