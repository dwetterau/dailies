//
//  LearningPage.swift
//  dailies
//
//  Created by David Wetterau on 12/25/24.
//

import AlertToast
import SwiftUI

struct LearningPage: View {
    @ObservedObject var entityListModel: EntityListModel
    @ObservedObject var categoryPageModel: CategoryPageModel
    @EnvironmentObject var notificationModel: NotificationModel

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                if let flashCardsEntityId = categoryPageModel.getEntityIdForType(.flashCards) {
                    let buttonText = entityListModel.getEntity(flashCardsEntityId)?.name ?? "Flash cards"
                    NavigationLink(value: "flashCards") {
                        BigButton(
                            buttonText: buttonText,
                            buttonCompleteColor: getColorForEntityCategory(.learning),
                            completionRatio: entityListModel.getCompletionRatio(for: flashCardsEntityId)
                        )
                    }.buttonStyle(ScaleButtonStyle())
                }
                ForEach(categoryPageModel.getEntityIdsForType(.genericCompletion), id: \.self) { entityId in
                    if let entityViewModel = entityListModel.getEntity(entityId) {
                        EntityCompletionButton(entityViewModel)
                    }
                }
            }
            .padding(.top, 40)
        }
        .navigationTitle("Learning")
        .navigationDestination(for: String.self) { destination in
            switch destination {
            case "flashCards":
                if let flashCardsEntityId = categoryPageModel.getEntityIdForType(.flashCards) {
                    FlashCardReviewPage(flashCardsEntityId)
                } else {
                    Text("no flash card entity")
                }
            default: Text("unknown destination")
            }
        }
        .toast(isPresenting: $notificationModel.shouldShowAllCompleteToast) {
            notificationModel.allCompleteToast
        }
    }
}
