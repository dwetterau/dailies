//
//  HomePage.swift
//  dailes dev
//
//  Created by David Wetterau on 12/22/24.
//

import SwiftUI

enum HomePageDestination {
    case careButton
    case exerciseButton
    case learningButton
    case tidyingButton
    case thinkingButton
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
    @StateObject
    var entityListModel: EntityListModel
    @StateObject
    var learningCategoryPageModel: CategoryPageModel
    var authModel: AuthModel

    init(authModel: AuthModel) {
        self.authModel = authModel
        let entityListModel = EntityListModel()
        _entityListModel = StateObject(wrappedValue: entityListModel)
        _learningCategoryPageModel = StateObject(wrappedValue: CategoryPageModel(
            .learning,
            entityListModel: entityListModel
        ))
    }

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
                    if learningCategoryPageModel.hasEntities() {
                        NavigationLink(value: HomePageDestination.learningButton) {
                            CategoryButton(entityListModel: entityListModel, category: .learning)
                        }.buttonStyle(ScaleButtonStyle())
                    }
                    ForEach([EntityCategory]([.care, .exercise, .tidying, .thinking]), id: \.self) { category in
                        if entityListModel.hasEntities(forCategory: category) {
                            NavigationLink(value: getHomePageDestination(forCategory: category)) {
                                CategoryButton(entityListModel: entityListModel, category: category)
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
                        ExercisePage(entityListModel: entityListModel)
                    case .learningButton:
                        LearningPage(entityListModel: entityListModel, categoryPageModel: learningCategoryPageModel)
                    case .careButton:
                        CarePage(entityListModel: entityListModel)
                    case .tidyingButton:
                        TidyingPage(entityListModel: entityListModel)
                    case .thinkingButton:
                        ThinkingPage(entityListModel: entityListModel)
                    }
                }
                Spacer()
            }
            .padding()
            .background(Color(.systemBackground)) // Default background
            .edgesIgnoringSafeArea(.all) // To allow the background to fill the screen
        }
    }
}

#Preview {
    HomePage(authModel: AuthModel())
}
