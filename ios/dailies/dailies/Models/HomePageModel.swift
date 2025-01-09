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

    private var entityListModelSubscription = Set<AnyCancellable>()
    private var learningCategoryPageModelSubscription = Set<AnyCancellable>()

    init() {
        let dayTimeRange = getDayTimeRangeForDate(Date())
        let entityListModel = EntityListModel(dayStartTimestamp: Int(dayTimeRange.start))
        self.entityListModel = entityListModel
        learningCategoryPageModel = CategoryPageModel(.learning, entityListModel: entityListModel)

        observeEntityListModel()

        learningCategoryPageModel.objectWillChange.sink { [weak self] _ in
            self?.objectWillChange.send()
        }
        .store(in: &learningCategoryPageModelSubscription)
    }

    private func observeEntityListModel() {
        // Clear existing subscriptions for the old model
        entityListModelSubscription.removeAll()

        // Observe the current model
        entityListModel.objectWillChange
            .sink { [weak self] _ in
                self?.objectWillChange.send()
            }
            .store(in: &entityListModelSubscription)
    }

    public func updateEntityListModelIfStale() {
        let dayTimeRange = getDayTimeRangeForDate(Date())
        let currentDayStartTimestamp = Int(dayTimeRange.start)
        if currentDayStartTimestamp != entityListModel.dayStartTimestamp {
            print("day start timestamp is stale, replacing EntityListModel")
            updateEntityListModel(EntityListModel(dayStartTimestamp: currentDayStartTimestamp))
        }
    }

    func updateEntityListModel(_ newModel: EntityListModel) {
        entityListModel = newModel
        observeEntityListModel() // Set up observation for the new model
    }
}
