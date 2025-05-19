import json

from lib import review_cards

def lambda_handler(event, context):
    """
    AWS Lambda entry point.

    Parameters:
    - event: dict, contains the event data (e.g., API Gateway request, S3 event, etc.)
    - context: LambdaContext object, contains runtime information

    Returns:
    - dict: response to be returned to the caller (e.g., API Gateway)
    """
    print("Received event:", json.dumps(event))

    # Parse the JSON body if it's a POST request with application/json
    body = json.loads(event.get("body", "{\"cards\": []}"))

    if not body['cards']:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "No cards provided", "debug": body['cards']})
        }
    
    # expected format: 
    # - cards is an array of to_dict card objects
    # - statuses is an array of the same size with the Review status for each card.
    if not body['statuses'] or len(body['cards']) != len(body['statuses']):
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Invalid input"})
        }

    cards, review_logs = review_cards(body['cards'], body['statuses'])

    # returns:
    # - new card objects in a list "cards"
    # - review logs in a list "review_logs"

    # Return response (for API Gateway Proxy integration format)
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps({
            cards: [card.to_dict() for card in cards],
            review_logs: [log.to_dict() for log in review_logs],
        })
    }