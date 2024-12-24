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
    // Encoded in ISO8601
    let dateString: String

    init() {
        numReviewed = 0
        numCorrect = 0

        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        dateString = isoFormatter.string(from: Date())
    }

    init(numReviewed: Int, numCorrect: Int, dateString: String) {
        self.numReviewed = numReviewed
        self.numCorrect = numCorrect
        self.dateString = dateString
    }

    func addReview(isCorrect: Bool) -> ReviewStats {
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        let storedDate = isoFormatter.date(from: dateString)!
        let numCorrectDelta = isCorrect ? 1 : 0
        if !Calendar.current.isDate(storedDate, inSameDayAs: Date()) {
            return ReviewStats(numReviewed: 1, numCorrect: numCorrectDelta, dateString: isoFormatter.string(from: Date()))
        } else {
            return ReviewStats(numReviewed: numReviewed + 1, numCorrect: numCorrect + numCorrectDelta, dateString: dateString)
        }
    }

    func getReviewStatusString() -> String? {
        if numReviewed == 0 {
            return nil
        }
        let percentCorrect = 100 * (Double(numCorrect) / Double(numReviewed))
        return "\(String(format: "%.2f", percentCorrect))% correct"
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

    // Used to stay subscribed to the query for cards
    private var cancellables = Set<AnyCancellable>()

    init() {
        var isInitialLocalDiskLoad = false
        if let loadedFlashCards: [FlashCard] = loadFromDisk(filename: flashCardFileName, type: [FlashCard].self) {
            print("Loaded \(loadedFlashCards.count) flash cards from disk")
            flashCards = loadedFlashCards
            isInitialLocalDiskLoad = true
        }
        if let loadedReviewStats: ReviewStats = loadFromDisk(filename: flashCardReviewStatsFileName, type: ReviewStats.self) {
            print("Loaded reviewStats from disk")
            reviewStats = loadedReviewStats
        }

        Task {
            client.subscribe(to: "flashCards:listCards", yielding: [FlashCard].self)
                .replaceError(with: [])
                .receive(on: DispatchQueue.main)
                .scan(flashCards) { currentFlashCards, newFlashCards in
                    // TODO: I could do this in all cases, but need to think through the actual save case where it
                    // deletes items.
                    if isInitialLocalDiskLoad {
                        var mergedFlashCards: [FlashCard] = []
                        var idToReviewStatus: [String: String] = [:]
                        for card in currentFlashCards {
                            if card.reviewStatus != nil {
                                idToReviewStatus[card._id] = card.reviewStatus
                            }
                        }
                        // Also add in the ones from the server, but skip over any duplicates
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

                        isInitialLocalDiskLoad = false
                        return mergedFlashCards
                    }
                    return newFlashCards
                }
                .assign(to: &$flashCards)
        }

        // TODO: We could split out the status from the rest of the cards, and then we only have
        // to save the status frequently.
        $flashCards
            .sink { newValue in
                // TODO: Don't always blindly overwrite - otherwise coming online will delete
                // any staged changes.
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
            return "No cards"
        }
        let numReviewedCards = flashCards.filter { card in
            card.reviewStatus != nil
        }.count
        let numTotalCards = flashCards.count
        let percentReviewed = 100 * (Double(numReviewedCards) / Double(numTotalCards))

        return "\(numReviewedCards)/\(numTotalCards) - \(String(format: "%.2f", percentReviewed))% reviewed"
    }

    public func getReviewStatsString() -> String? {
        return reviewStats.getReviewStatusString()
    }

    public func saveReviewStatuses(completion: @escaping () -> Void) {
        let cardsToSave: ConvexEncodable = flashCards.filter { card in
            card.reviewStatus != nil
        }.map { card in
            ["id": card._id, "reviewStatus": card.reviewStatus!]
        }
        isSaving = true
        Task {
            do {
                try await client.mutation("flashCards:startSaveReviewStatus", with: [
                    "cards": cardsToSave,
                ])
                completion()
            } catch let ClientError.ConvexError(data) {
                let errorMessage = try! JSONDecoder().decode(String.self, from: Data(data.utf8))
                print(errorMessage)
            } catch {
                print("An unknown error occurred: \(error)")
            }
            await MainActor.run {
                self.isSaving = false
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

func saveToDisk<T: Codable>(_ objects: T, filename: String) {
    let fileManager = FileManager.default
    guard let directory = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first else {
        print("Error: Unable to access document directory")
        return
    }

    let fileURL = directory.appendingPathComponent(filename)

    do {
        let data = try JSONEncoder().encode(objects)
        try data.write(to: fileURL)
        // print("Saved data to \(fileURL)")
    } catch {
        print("Error saving data: \(error)")
    }
}

func loadFromDisk<T: Codable>(filename: String, type _: T.Type) -> T? {
    let fileManager = FileManager.default
    guard let directory = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first else {
        print("Error: Unable to access document directory")
        return nil
    }

    let fileURL = directory.appendingPathComponent(filename)

    do {
        let data = try Data(contentsOf: fileURL)
        let objects = try JSONDecoder().decode(T.self, from: data)
        print("Loaded data from \(fileURL)")
        return objects
    } catch {
        print("Error loading data: \(error)")
        return nil
    }
}
