//
//  FlashCardReviewModel.swift
//  dailies
//
//  Created by David Wetterau on 12/22/24.
//

import Combine
import ConvexMobile
import SwiftUI

struct FlashCard: Decodable, Hashable, Encodable {
    let _id: String
    let ownerId: String
    let remoteId: String
    let side1: String
    let side2: String
    let details: String
    let reviewStatus: String?
}

let flashCardFileName = "offlineFlashCards.json"

struct ReviewStats: Decodable, Encodable {
    let numReviewed: Int
    let numCorrect: Int
    let timestamp: Int

    init() {
        numReviewed = 0
        numCorrect = 0
        timestamp = getCurrentTimestamp()
    }

    init(numReviewed: Int, numCorrect: Int, timestamp: Int) {
        self.numReviewed = numReviewed
        self.numCorrect = numCorrect
        self.timestamp = timestamp
    }

    func addReview(isCorrect: Bool) -> ReviewStats {
        let storedDate = getDateFromTimestamp(timestamp)
        let numCorrectDelta = isCorrect ? 1 : 0
        if !Calendar.current.isDate(storedDate, inSameDayAs: Date()) {
            return ReviewStats(numReviewed: 1, numCorrect: numCorrectDelta, timestamp: getCurrentTimestamp())
        } else {
            return ReviewStats(numReviewed: numReviewed + 1, numCorrect: numCorrect + numCorrectDelta, timestamp: timestamp)
        }
    }

    func getReviewStatusString() -> String? {
        if numReviewed == 0 {
            return nil
        }
        let percentCorrect = 100 * (Double(numCorrect) / Double(numReviewed))
        return "\(numReviewed) reviewed - \(String(format: "%.2f", percentCorrect))%"
    }
}

let flashCardReviewStatsFileName = "offlineFlashCardReviewStats.json"

class FlashCardReviewModel: ObservableObject {
    @Published
    var flashCards: [FlashCard] = []
    @Published
    var reviewStats = ReviewStats()

    @Published
    public var isSaving: Bool = false
    @Published
    public var isLoading: Bool = false

    @ObservedObject
    private var entity: EntityViewModel
    // Used to stay subscribed to the query for cards
    private var cancellables = Set<AnyCancellable>()

    init(_ entityViewModel: EntityViewModel) {
        entity = entityViewModel
        let timeRange = getTimeRangeForDate(Date())

        if let loadedFlashCards: [FlashCard] = loadFromDisk(filename: flashCardFileName, type: [FlashCard].self) {
            print("Loaded \(loadedFlashCards.count) flash cards from disk")
            flashCards = loadedFlashCards
        }
        if let loadedReviewStats: ReviewStats = loadFromDisk(filename: flashCardReviewStatsFileName, type: ReviewStats.self) {
            if isInTimeRange(timeRange, loadedReviewStats.timestamp) {
                print("Loaded reviewStats from disk")
                reviewStats = loadedReviewStats
            } else {
                // TODO: We should try to save these
                print("review stats were too old, and ignored")
            }
        }

        Task {
            client.subscribe(to: "flashCards:listCards", yielding: [FlashCard].self)
                .handleEvents(receiveCompletion: logHandlers("flashCards:listCards"))
                .replaceError(with: [])
                .receive(on: DispatchQueue.main)
                .combineLatest($flashCards)
                .map { newFlashCards, currentFlashCards in
                    var mergedFlashCards: [FlashCard] = []
                    var idToReviewStatus: [String: String] = [:]
                    for card in currentFlashCards {
                        if card.reviewStatus != nil {
                            idToReviewStatus[card._id] = card.reviewStatus
                        }
                    }
                    // Only ever use the ones from the server, but always prefer the local review STatus
                    for card in newFlashCards {
                        if let reviewStatus = idToReviewStatus[card._id] {
                            mergedFlashCards.append(FlashCard(
                                _id: card._id,
                                ownerId: card.ownerId,
                                remoteId: card.remoteId,
                                side1: card.side1,
                                side2: card.side2,
                                details: card.details,
                                reviewStatus: reviewStatus
                            ))
                        } else {
                            mergedFlashCards.append(card)
                        }
                    }
                    return mergedFlashCards
                }
                .assign(to: &$flashCards)
            client.subscribe(to: "events:getCurrentDayEvent", with: [
                "entityId": entity.id,
                "timeRange": [
                    "startTimestamp": timeRange.start,
                    "endTimestamp": timeRange.end,
                ],
            ], yielding: Event?.self)
                .handleEvents(receiveCompletion: logHandlers("FlashCardReviewModel events:getCurrentDayEvent"))
                .replaceError(with: nil)
                .receive(on: DispatchQueue.main)
                .combineLatest($reviewStats)
                .map { newCurrentEvent, currentReviewStats in
                    if let eventDetails = newCurrentEvent?.details {
                        if case let .flashCards(flashCardsEvent) = eventDetails {
                            if newCurrentEvent!.timestamp > currentReviewStats.timestamp {
                                return ReviewStats(
                                    numReviewed: flashCardsEvent.numReviewed,
                                    numCorrect: flashCardsEvent.numCorrect,
                                    timestamp: newCurrentEvent!.timestamp
                                )
                            }
                        }
                    }
                    return currentReviewStats
                }
                .assign(to: &$reviewStats)
        }

        // TODO: We could split out the status from the rest of the cards, and then we only have
        // to save the status frequently.
        $flashCards
            .sink { newValue in
                saveToDisk(newValue, filename: flashCardFileName)
            }
            .store(in: &cancellables)

        $reviewStats.sink { newValue in
            saveToDisk(newValue, filename: flashCardReviewStatsFileName)
        }.store(in: &cancellables)
    }

    public func getCurrentCard() -> FlashCard? {
        return flashCards.first(where: { card in card.reviewStatus == nil })
    }

    public func setCurrentCardReviewStatus(_ status: String) {
        flashCards = flashCards.map { card in
            if card._id == self.getCurrentCard()?._id {
                return FlashCard(
                    _id: card._id,
                    ownerId: card.ownerId,
                    remoteId: card.remoteId,
                    side1: card.side1,
                    side2: card.side2,
                    details: card.details,
                    reviewStatus: status
                )
            }
            return card
        }
        reviewStats = reviewStats.addReview(isCorrect: status != "Wrong")
    }

    public func getCardCountStats() -> String {
        if flashCards.count == 0 {
            return "0 loaded"
        }
        let numReviewedCards = flashCards.filter { card in
            card.reviewStatus != nil
        }.count
        let numTotalCards = flashCards.count
        return "\(numReviewedCards)/\(numTotalCards) loaded"
    }

    public func getReviewStatsString() -> String? {
        return reviewStats.getReviewStatusString()
    }

    public func saveReviewStatuses(completion: @escaping () -> Void) {
        isSaving = true
        let cardsToSave: ConvexEncodable = flashCards.filter { card in
            card.reviewStatus != nil
        }.map { card in
            ["id": card._id, "reviewStatus": card.reviewStatus!]
        }
        let timestamp = reviewStats.timestamp
        let timeRange = getTimeRangeForDate(getDateFromTimestamp(timestamp))
        Task {
            do {
                try await client.mutation("flashCards:startSaveReviewStatus", with: [
                    "cards": cardsToSave,
                ])
                try await client.mutation("events:upsertDayEvent", with: [
                    "entityId": self.entity.id,
                    "timeRange": [
                        "startTimestamp": timeRange.start,
                        "endTimestamp": timeRange.end,
                    ],
                    "timestamp": Float64(timestamp),
                    "details": EventType.flashCards(
                        FlashCardsDetails(
                            numReviewed: reviewStats.numReviewed,
                            numCorrect: reviewStats.numCorrect
                        )
                    ),
                ])
            } catch let ClientError.ConvexError(data) {
                let errorMessage = try! JSONDecoder().decode(String.self, from: Data(data.utf8))
                print(errorMessage)
            } catch {
                print("An unknown error occurred: \(error)")
            }

            await MainActor.run {
                self.isSaving = false
                completion()
            }
        }
    }

    public func loadMoreFlashCards(completion: @escaping () -> Void) {
        isLoading = true
        Task {
            do {
                try await client.mutation("flashCards:startSyncCards")
                completion()
            } catch let ClientError.ConvexError(data) {
                let errorMessage = try! JSONDecoder().decode(String.self, from: Data(data.utf8))
                print(errorMessage)
            } catch {
                print("An unknown error occurred: \(error)")
            }
            await MainActor.run {
                self.isLoading = false
            }
        }
    }
}
