//
//  FlashCardReviewPage.swift
//  dailes dev
//
//  Created by David Wetterau on 12/22/24.
//

import SwiftUI

struct FlashCardReviewPage: View {
    @ObservedObject var viewModel = FlashCardReviewModel()

    var body: some View {
        VStack {
            if let card = viewModel.getCurrentCard() {
                FlashCardView(card)
            }
        }
        .navigationTitle("Flash Cards")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button(action: {
                    Task {
                        // TODO: Initiate a sync
                    }
                }) {
                    Text("Load").padding(.trailing, 10)
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button(action: {
                    Task {
                        // TODO: Initiate a sync
                    }
                }) {
                    Text("Save").padding(.leading, 2)
                }
            }
        }
    }
}

struct PreviewContentWrapper: View {
    var body: some View {
        NavigationStack {
            List {
                NavigationLink("go", destination: FlashCardReviewPage())
            }
        }
    }
}

#Preview {
    NavigationStack {
        PreviewContentWrapper()
    }
}
