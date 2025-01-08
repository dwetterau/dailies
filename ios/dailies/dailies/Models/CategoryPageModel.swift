//
//  CategoryPageModel.swift
//  dailies
//
//  Created by David Wetterau on 12/28/24.
//

import Combine
import SwiftUI

func getCategoryPageModelFilename(category: EntityCategory) -> String {
    "CategoryPageModel-\(category.rawValue)-v2.json"
}

class CategoryPageModel: ObservableObject {
    let category: EntityCategory
    private var subscriptions = Set<AnyCancellable>()

    // TODO: Also keep track of entityName and numRequiredCompletions, for substitution of
    // more models while offline
    @Published
    private var entityTypeToIds: [EntityType: [String]] = [:]

    @ObservedObject
    var entityListModel: EntityListModel

    init(_ category: EntityCategory, entityListModel: EntityListModel) {
        self.category = category
        self.entityListModel = entityListModel
        if let loadedPages = loadFromDisk(
            filename: getCategoryPageModelFilename(category: category),
            type: [EntityType: [String]].self
        ) {
            print("Loaded pages for category \(category) from disk: \(loadedPages)")
            entityTypeToIds = loadedPages
        } else {
            entityTypeToIds = getEntityTypeToIds(from: entityListModel.entities.entityViewModels)
        }

        entityListModel.$entities.sink { [weak self] newModels in
            guard let self = self else { return }
            // Exit early if `self` is nil
            let newEntityTypeToIds = self.getEntityTypeToIds(from: newModels.entityViewModels)
            if newEntityTypeToIds.isEmpty {
                print("Received empty entities, ignoring them")
            } else {
                print("Saving newEntityToTypeIds \(newEntityTypeToIds)")
                self.entityTypeToIds = newEntityTypeToIds
                saveToDisk(newEntityTypeToIds, filename: getCategoryPageModelFilename(category: category))
            }
        }.store(in: &subscriptions)
    }

    public func hasEntities() -> Bool {
        return !entityTypeToIds.isEmpty
    }

    public func getEntityIdForType(_ type: EntityType) -> String? {
        getEntityIdsForType(type).first
    }

    public func getEntityIdsForType(_ type: EntityType) -> [String] {
        entityTypeToIds[type] ?? []
    }

    func getEntityTypeToIds(from entityViewModels: [EntityViewModel]) -> [EntityType: [String]] {
        var entityTypeToId: [EntityType: [String]] = [:]
        for entityViewModel in entityViewModels {
            if entityViewModel.category == category {
                if entityTypeToId[entityViewModel.type] != nil {
                    entityTypeToId[entityViewModel.type]!.append(entityViewModel.id)
                } else {
                    entityTypeToId[entityViewModel.type] = [entityViewModel.id]
                }
            }
        }
        return entityTypeToId
    }
}
