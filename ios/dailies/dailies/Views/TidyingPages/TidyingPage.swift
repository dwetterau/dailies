//
//  TidyingPage.swift
//  dailies
//
//  Created by David Wetterau on 12/25/24.
//

import SwiftUI

struct TidyingPage: View {
    @ObservedObject var entityListModel: EntityListModel
    @EnvironmentObject var notificationModel: NotificationModel

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                ForEach(entityListModel.getEntities(forCategory: .tidying), id: \.id) { entityViewModel in
                    switch entityViewModel.type {
                    case .genericCompletion:
                        EntityCompletionButton(entityViewModel)
                    default:
                        Text("unsupported entity type: \(entityViewModel.type)")
                    }
                }
            }
            .padding(.top, 40)
        }
        .navigationTitle("Tidying")
        .toast(isPresenting: $notificationModel.shouldShowAllCompleteToast) {
            notificationModel.allCompleteToast
        }
    }
}
