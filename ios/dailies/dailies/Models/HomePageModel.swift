//
//  HomePageModel.swift
//  dailies
//
//  Created by David Wetterau on 1/7/25.
//

import SwiftUI

class HomePageModel: ObservableObject {
    @Published
    public private(set) var entityListModel: EntityListModel
    @Published
    public private(set) var learningCategoryPageModel: CategoryPageModel

    init() {
        print("Home page model init() called")
        // TODO: Reset these when the day changes?
        let entityListModel = EntityListModel()
        self.entityListModel = entityListModel
        learningCategoryPageModel = CategoryPageModel(.learning, entityListModel: entityListModel)
    }
}
