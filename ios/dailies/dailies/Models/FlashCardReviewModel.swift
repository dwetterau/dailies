//
//  FlashCardReviewModel.swift
//  dailies
//
//  Created by David Wetterau on 12/22/24.
//

import ConvexMobile
import SwiftUI

struct FlashCard: Decodable, Hashable {
    let _id: String
    let ownerId: String
    let remoteId: String
    let side1: String
    let side2: String
    let details: String
    let reviewStatus: String?
}

class FlashCardReviewModel: ObservableObject {
    @Published
    var flashCards: [FlashCard] = []

    @Published
    public var isSaving: Bool = false

    init() {
        Task {
            client.subscribe(to: "flashCards:listCards", yielding: [FlashCard].self)
                .replaceError(with: [])
                .receive(on: DispatchQueue.main)
                .assign(to: &$flashCards)
        }
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
