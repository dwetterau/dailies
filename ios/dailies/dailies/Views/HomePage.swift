//
//  HomePage.swift
//  dailes dev
//
//  Created by David Wetterau on 12/22/24.
//

import SwiftUI

enum HomePageDestinations {
    case careButton
    case exerciseButton
    case learningButton
}

struct HomePage: View {
    @StateObject
    var entityListModel: EntityListModel
    var authModel: AuthModel

    init(authModel: AuthModel) {
        self.authModel = authModel
        _entityListModel = StateObject(wrappedValue: EntityListModel())
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
                    NavigationLink(value: HomePageDestinations.learningButton) {
                        LearningPageButton(entityListModel: self.entityListModel)
                    }
                    NavigationLink(value: HomePageDestinations.careButton) {
                        CarePageButton(entityListModel: self.entityListModel)
                    }
                    NavigationLink(value: HomePageDestinations.exerciseButton) {
                        ExercisePageButton(entityListModel: self.entityListModel)
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
                .navigationDestination(for: HomePageDestinations.self) { destination in
                    switch destination {
                    case .exerciseButton:
                        ExercisePage(entityListModel: entityListModel)
                    case .learningButton:
                        LearningPage(entityListModel: entityListModel)
                    case .careButton:
                        CarePage(entityListModel: entityListModel)
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
