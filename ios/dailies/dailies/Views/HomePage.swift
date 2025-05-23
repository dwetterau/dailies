//
//  HomePage.swift
//  dailes dev
//
//  Created by David Wetterau on 12/22/24.
//

import AlertToast
import SwiftUI

enum HomePageDestination {
    case careButton
    case exerciseButton
    case learningButton
    case tidyingButton
    case thinkingButton
    case newEntityButton
}

func getHomePageDestination(forCategory category: EntityCategory) -> HomePageDestination {
    switch category {
    case .care:
        .careButton
    case .exercise:
        .exerciseButton
    case .learning:
        .learningButton
    case .tidying:
        .tidyingButton
    case .thinking:
        .thinkingButton
    }
}

struct HomePage: View {
    var authModel: AuthModel

    @ObservedObject
    var homePageModel: HomePageModel

    @StateObject
    var notificationModel = NotificationModel()

    @State var showSaveSuccessToast = false

    var body: some View {
        NavigationStack {
            VStack {
                // Title Section
                Text("Dailies")
                    .font(.system(size: 40, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)
                    .padding(.top, 100) // Spacing from the top

                // Buttons Section
                VStack(spacing: 20) {
                    if self.homePageModel.learningCategoryPageModel.hasEntities() {
                        NavigationLink(value: HomePageDestination.learningButton) {
                            CategoryButton(entityListModel: self.homePageModel.entityListModel, category: .learning)
                        }.buttonStyle(ScaleButtonStyle())
                    }
                    ForEach([EntityCategory]([.care, .exercise, .tidying, .thinking]), id: \.self) { category in
                        if hasEntitiesInCategory(category) {
                            NavigationLink(value: getHomePageDestination(forCategory: category)) {
                                CategoryButton(entityListModel: self.homePageModel.entityListModel, category: category)
                            }.buttonStyle(ScaleButtonStyle())
                        }
                    }
                    Spacer()
                    Button(action: {
                        authModel.logout()
                    }) {
                        Text("Logout")
                            .padding(.top, 20)
                    }
                }
                .padding(.top, 100) // Spacing from the top
                .navigationDestination(for: HomePageDestination.self) { destination in
                    switch destination {
                    case .exerciseButton:
                        ExercisePage(entityListModel: self.homePageModel.entityListModel).environmentObject(notificationModel)
                    case .learningButton:
                        LearningPage(entityListModel: self.homePageModel.entityListModel, categoryPageModel: self.homePageModel.learningCategoryPageModel).environmentObject(notificationModel)
                    case .careButton:
                        CarePage(entityListModel: self.homePageModel.entityListModel).environmentObject(notificationModel)
                    case .tidyingButton:
                        TidyingPage(entityListModel: self.homePageModel.entityListModel).environmentObject(notificationModel)
                    case .thinkingButton:
                        ThinkingPage(entityListModel: self.homePageModel.entityListModel).environmentObject(notificationModel)
                    case .newEntityButton:
                        EntityEditPage {
                            showSaveSuccessToast = true
                        }
                    }
                }
                Spacer()
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink(value: HomePageDestination.newEntityButton) {
                        Text("New")
                    }
                }
            }.toast(isPresenting: $showSaveSuccessToast) {
                AlertToast(type: .complete(.green), title: "Saved!")
            }.toast(isPresenting: $notificationModel.shouldShowAllCompleteToast) {
                notificationModel.allCompleteToast
            }
            .padding()
            .background(Color(.systemBackground)) // Default background
            .edgesIgnoringSafeArea(.all) // To allow the background to fill the screen
        }
        .onChange(of: homePageModel.entityListModel.entitiesFromServer) { _, _ in
            if homePageModel.entityListModel.areAllCategoriesComplete {
                // TODO: Cancel notification
                // TODO: Don't show the toast if they were all complete on initial load
                notificationModel.setShouldShowAllCompleteToast(true)
            }
        }
    }

    func hasEntitiesInCategory(_ category: EntityCategory) -> Bool {
        homePageModel.entityListModel.hasEntities(forCategory: category)
    }
}

#Preview {
    HomePage(authModel: AuthModel(), homePageModel: HomePageModel())
}
