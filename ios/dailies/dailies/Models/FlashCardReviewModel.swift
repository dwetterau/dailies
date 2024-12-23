//
//  FlashCardModel.swift
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
    var flashCards: Array<FlashCard> = [];
    
    init() {
        Task {
            client.subscribe(to: "flashCards:listCards", yielding: Array<FlashCard>.self)
                .replaceError(with: [])
                .receive(on: DispatchQueue.main)
                .assign(to: &$flashCards)
        }
    }
   
    public func getCurrentCard() -> FlashCard? {
        return self.flashCards.first
    }
}
