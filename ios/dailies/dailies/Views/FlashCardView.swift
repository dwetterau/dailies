//
//  FlashCardView.swift
//  dailes dev
//
//  Created by David Wetterau on 12/22/24.
//

import SwiftUI

struct FlashCardView: View {
    let card: FlashCard
    @State var showSide2: Bool = false

    init(_ card: FlashCard) {
        self.card = card
    }

    var body: some View {
        VStack {
            Text(self.card.side1)
                .font(.system(size: 40))
                .padding(.bottom, 10)
            if !showSide2 {
                Button("Show") {
                    self.showSide2 = true
                }
            } else {
                Text(self.card.side2)
                if !self.card.details.isEmpty {
                    Text(self.card.details)
                        .padding(.top, 10)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemBackground)) // Built-in system background color
        .cornerRadius(16)
        .shadow(color: Color(.label).opacity(0.1), radius: 8, x: 0, y: 4) // Subtle shadow
        .padding(.horizontal, 20)
        .onChange(of: card) {
            showSide2 = false
        }
    }
}

#Preview {
    FlashCardView(FlashCard(_id: "testId", ownerId: "testOwnerId", remoteId: "testRemoteId", side1: "Side 1", side2: "Side 2", details: "Longer detail text explanation", reviewStatus: nil))
}
