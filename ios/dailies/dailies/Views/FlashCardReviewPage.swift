//
//  FlashCardReviewPage.swift
//  dailes dev
//
//  Created by David Wetterau on 12/22/24.
//

import SwiftUI

struct FlashCardReviewPage: View {
    var body: some View {
        VStack {
            Text("Hello world")
        }
        .navigationTitle("Flash Cards")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button(action: {
                    Task {
                        // TODO: Initiate a sync
                    }
                }) {
                    Text("Lqoad").padding(.trailing, 10)
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
