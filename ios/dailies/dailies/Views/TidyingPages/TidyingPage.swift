//
//  TidyingPage.swift
//  dailies
//
//  Created by David Wetterau on 12/25/24.
//

import SwiftUI

struct TidyingPage: View {
    @ObservedObject var entityListModel: EntityListModel

    var body: some View {
        VStack(spacing: 20) {
            ForEach(entityListModel.getEntities(forCategory: .tidying), id: \.id) { entityViewModel in
                switch entityViewModel.type {
                case .genericCompletion:
                    EntityCompletionButton(entityViewModel)
                default:
                    Text("unsupported entity type: \(entityViewModel.type)")
                }
            }
        }.navigationTitle("Tidying")
    }
}
