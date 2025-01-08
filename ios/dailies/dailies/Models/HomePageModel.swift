//
//  HomePageModel.swift
//  dailies
//
//  Created by David Wetterau on 1/7/25.
//

import Combine
import SwiftUI

class HomePageModel: ObservableObject {
    @Published
    public private(set) var entityListModel: EntityListModel
    @Published
    public private(set) var learningCategoryPageModel: CategoryPageModel

    private var subscriptions = Set<AnyCancellable>()
    
    init() {
        print("Home page model init() called")
        // TODO: Reset these when the day changes?
        let entityListModel = EntityListModel()
        self.entityListModel = entityListModel
        learningCategoryPageModel = CategoryPageModel(.learning, entityListModel: entityListModel)
        
        // Manually observe changes
        entityListModel.objectWillChange
            .sink { [weak self] _ in
                self?.objectWillChange.send()
            }
            .store(in: &subscriptions)
    }
}
