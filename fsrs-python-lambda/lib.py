from typing import List, Tuple
from fsrs import Scheduler, Card, Rating, ReviewLog

def review_cards(cards: List[object], statuses: List[Rating]) -> Tuple[List[Card], List[ReviewLog]]:
    """
    Review a list of cards with their corresponding statuses.

    Parameters:
    - cards: List of Card objects to be reviewed (still in raw dict form).
    - statuses: List of Rating objects corresponding to the review status of each card.

    Returns:
    - Tuple containing:
        - List of updated Card objects.
        - List of ReviewLog objects for each review.
    """
    scheduler = Scheduler()
    new_cards = []
    review_logs = []

    for raw_card, status in zip(cards, statuses):
        card, review_log = scheduler.review_card(Card.from_dict(raw_card), Rating(status))
        new_cards.append(card)
        review_logs.append(review_log)

    return new_cards, review_logs
