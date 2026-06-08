Feature: Notification Management

  Scenario Outline: Dispatch a notification — record starts in PENDING status
    When I dispatch a notification with id "<id>" type "<type>" channel "<channel>"
    Then the notification "<id>" has status "<expected_status>"
    And the notification "<id>" has attempt_count "<expected_attempt_count>"

    Examples:
      | id                                   | type            | channel | expected_status | expected_attempt_count |
      | aaa00000-0000-0000-0000-000000000001 | ALERT_TRIGGERED | EMAIL   | PENDING         | 0                      |

  Scenario Outline: Cancel a PENDING notification
    Given a notification "<id>" in PENDING status channel "<channel>" exists
    When I cancel the notification "<id>"
    Then the notification "<id>" has status "<expected_status>"

    Examples:
      | id                                   | channel | expected_status |
      | aaa00000-0000-0000-0000-000000000002 | EMAIL   | CANCELLED       |

  Scenario Outline: Retry a FAILED notification — status resets to PENDING
    Given a notification "<id>" in FAILED status channel "<channel>" max_attempts "<max_attempts>" exists
    When I retry the notification "<id>"
    Then the notification "<id>" has status "<expected_status>"

    Examples:
      | id                                   | channel | max_attempts | expected_status |
      | aaa00000-0000-0000-0000-000000000003 | EMAIL   | 3            | PENDING         |

  Scenario Outline: Cannot cancel a non-PENDING notification
    Given a notification "<id>" in DELIVERED status channel "<channel>" exists
    When I cancel the notification "<id>"
    Then the response status is "<expected_http_status>"

    Examples:
      | id                                   | channel | expected_http_status |
      | aaa00000-0000-0000-0000-000000000004 | EMAIL   | 400                  |

  Scenario Outline: Cannot retry a DELIVERED notification
    Given a notification "<id>" in DELIVERED status channel "<channel>" exists
    When I retry the notification "<id>"
    Then the response status is "<expected_http_status>"

    Examples:
      | id                                   | channel | expected_http_status |
      | aaa00000-0000-0000-0000-000000000005 | EMAIL   | 400                  |

  Scenario Outline: Update a notification preference — stored with correct values
    When I set preference channel "<channel>" type "<type>" enabled "<enabled>" destination "<destination>"
    Then my preference channel "<channel>" type "<type>" has enabled "<expected_enabled>"
    And my preference channel "<channel>" type "<type>" has destination "<expected_destination>"

    Examples:
      | channel | type            | enabled | destination      | expected_enabled | expected_destination |
      | EMAIL   | ALERT_TRIGGERED | true    | user@example.com | true             | user@example.com     |
      | SLACK   | DEVICE_OFFLINE  | false   | none             | false            | none                 |

  Scenario Outline: Get notification history returns created records
    Given a notification "<id>" in PENDING status channel "<channel>" exists
    When I list my notifications
    Then the notification history includes "<id>"

    Examples:
      | id                                   | channel |
      | aaa00000-0000-0000-0000-000000000006 | EMAIL   |

  Scenario Outline: Get a single notification record by id
    Given a notification "<id>" in PENDING status channel "<channel>" exists
    When I get the notification "<id>"
    Then the notification "<id>" has status "<expected_status>"

    Examples:
      | id                                   | channel | expected_status |
      | aaa00000-0000-0000-0000-000000000007 | EMAIL   | PENDING         |
