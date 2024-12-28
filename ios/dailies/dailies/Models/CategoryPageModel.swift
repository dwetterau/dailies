//
//  CategoryPageModel.swift
//  dailies
//
//  Created by David Wetterau on 12/28/24.
//

import Combine
import SwiftUI

func getCategoryPageModelFilename(category: EntityCategory) -> String {
    "CategoryPageModel-\(category.rawValue).json"
}

class CategoryPageModel: ObservableObject {
    let category: EntityCategory
    private var subscriptions = Set<AnyCancellable>()

    // TODO: Also keep track of entityName and numRequiredCompletions, for substitution of
    // more models while offline
    @Published
    private var entityTypeToId: [EntityType: String] = [:]

    @ObservedObject
    var entityListModel: EntityListModel

    init(_ category: EntityCategory, entityListModel: EntityListModel) {
        self.category = category
        self.entityListModel = entityListModel
        if let loadedPages = loadFromDisk(
            filename: getCategoryPageModelFilename(category: category),
            type: [EntityType: String].self
        ) {
            print("Loaded pages for category \(category) from disk: \(loadedPages)")
            entityTypeToId = loadedPages
        } else {
            entityTypeToId = getEntityTypeToId(from: entityListModel.entityViewModels)
        }

        entityListModel.$entityViewModels.sink { newModels in
            let newEntityTypeToId = self.getEntityTypeToId(from: newModels)
            if newEntityTypeToId.isEmpty {
                print("Received empty entities, ignoring them")
            } else {
                self.entityTypeToId = newEntityTypeToId
                saveToDisk(newEntityTypeToId, filename: getCategoryPageModelFilename(category: category))
            }
        }.store(in: &subscriptions)
    }

    public func getEntityIdForType(_ type: EntityType) -> String? {
        entityTypeToId[type]
    }

    private func getEntityTypeToId(from entityViewModels: [EntityViewModel]) -> [EntityType: String] {
        var entityTypeToId: [EntityType: String] = [:]
        for entityViewModel in entityViewModels {
            if entityViewModel.category == category {
                if entityTypeToId[entityViewModel.type] != nil {
                    print("WARNING: Overwriting entity type: \(entityViewModel.category)/\(entityViewModel.type)")
                }
                entityTypeToId[entityViewModel.type] = entityViewModel.id
            }
        }
        return entityTypeToId
    }
}
