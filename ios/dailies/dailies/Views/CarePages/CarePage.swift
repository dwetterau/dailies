//
//  CarePage.swift
//  dailies
//
//  Created by David Wetterau on 12/25/24.
//

import SwiftUI

struct CarePage: View {
    @ObservedObject var entityListModel: EntityListModel
    @EnvironmentObject var notificationModel: NotificationModel

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                ForEach(entityListModel.getEntities(forCategory: .care), id: \.id) { entityViewModel in
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
        .navigationTitle("Care")
        .toast(isPresenting: $notificationModel.shouldShowAllCompleteToast) {
            notificationModel.allCompleteToast
        }
    }
}
