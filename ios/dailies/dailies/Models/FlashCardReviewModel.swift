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

class FlashCardReviewModel: ObservableObject {
    @Published
    var flashCards: [FlashCard] = []

    @Published
    public var isSaving: Bool = false

    // Used to stay subscribed to the query for cards
    private var cancellables = Set<AnyCancellable>()

    init() {
        var isInitialLocalDiskLoad = false
        if let loadedFlashCards: [FlashCard] = loadFromDisk(filename: flashCardFileName, type: FlashCard.self) {
            print("Loaded \(loadedFlashCards.count) flash cards from disk")
            flashCards = loadedFlashCards
            isInitialLocalDiskLoad = true
        }

        Task {
            client.subscribe(to: "flashCards:listCards", yielding: [FlashCard].self)
                .replaceError(with: [])
                .receive(on: DispatchQueue.main)
                .scan(flashCards) { currentFlashCards, newFlashCards in
                    if isInitialLocalDiskLoad {
                        print("have \(currentFlashCards.count) local flashcards to merge in")

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
    }

    public func getStatusString() -> String {
        if flashCards.count == 0 {
            return "No cards loaded"
        }
        let numReviewedCards = flashCards.filter { card in
            card.reviewStatus != nil
        }.count
        let numTotalCards = flashCards.count
        let percentReviewed = 100 * (Double(numReviewedCards) / Double(numTotalCards))

        return "\(numReviewedCards)/\(numTotalCards) - \(String(format: "%.2f", percentReviewed))%"
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
}

func saveToDisk<T: Codable>(_ objects: [T], filename: String) {
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

func loadFromDisk<T: Codable>(filename: String, type _: T.Type) -> [T]? {
    let fileManager = FileManager.default
    guard let directory = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first else {
        print("Error: Unable to access document directory")
        return nil
    }

    let fileURL = directory.appendingPathComponent(filename)

    do {
        let data = try Data(contentsOf: fileURL)
        let objects = try JSONDecoder().decode([T].self, from: data)
        print("Loaded data from \(fileURL)")
        return objects
    } catch {
        print("Error loading data: \(error)")
        return nil
    }
}
