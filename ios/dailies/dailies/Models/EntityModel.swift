//
//  ViewModel.swift
//  dailies
//
//  Created by David Wetterau on 12/1/24.
//
import Combine
import SwiftUI

enum EntityCategory: String, Codable {
    case exercise
    case learning
    case care
    case thinking
    case tidying
}

enum EntityType: String, Codable {
    case workoutMachineWithWeight
    case workoutWithDistance
    case workoutWithTime
    case flashCards
    case duolingo
    case hydration
    case journaling
    case prescriptions
}

struct Entity: Decodable, Hashable {
    let _id: String
    let ownerId: String
    let name: String
    let category: EntityCategory
    let type: EntityType
    let isRequiredDaily: Bool
    let numRequiredCompletions: Int?
}

let emptyEntity = Entity(
    _id: "",
    ownerId: "",
    name: "",
    category: .exercise,
    type: .workoutWithTime,
    isRequiredDaily: false,
    numRequiredCompletions: nil
)

struct Entities: Decodable {
    let entities: [Entity]
    let entityIdToIsDone: [String: Bool]
    let entityIdToCompletionRatio: [String: Float64]

    func getCompletionRatio(for entityId: String) -> CGFloat {
        if entityIdToIsDone[entityId] ?? false {
            return 1
        }
        if let completionRatio = entityIdToCompletionRatio[entityId] {
            return CGFloat(completionRatio)
        }
        return 0
    }
}

class EntityModelWithEvents: ObservableObject {
    @Published
    var entity: Entity = emptyEntity

    @Published
    var events: [Event] = []
    init(entity: Entity) {
        self.entity = entity
        Task {
            client.subscribe(to: "entities:get", with: ["id": entity._id], yielding: Entity.self)
                .handleEvents(receiveCompletion: logHandlers("entities:get"))
                .replaceError(with: emptyEntity)
                .receive(on: DispatchQueue.main)
                .assign(to: &$entity)
            client.subscribe(to: "events:list", with: ["entityId": entity._id], yielding: [Event].self)
                .handleEvents(receiveCompletion: logHandlers("events:list"))
                .replaceError(with: [])
                .receive(on: DispatchQueue.main)
                .assign(to: &$events)
        }
    }
}

func getColorForEntityCategory(_ entityCategory: EntityCategory) -> Color {
    switch entityCategory {
    case .care:
        return .blue
    case .learning:
        return .green
    case .exercise:
        return .purple
    default:
        return .gray
    }
}

class EntityViewModel: ObservableObject {
    @Published
    private var entity: Entity

    @Published
    public private(set) var isDone: Bool

    init(_ entity: Entity, isDone: Bool) {
        self.entity = entity
        self.isDone = isDone
    }

    public var id: String {
        return entity._id
    }

    public var category: EntityCategory {
        return entity.category
    }

    public var type: EntityType {
        return entity.type
    }

    public var name: String {
        return entity.name
    }

    public var buttonColor: Color {
        return getColorForEntityCategory(category)
    }

    public var numRequiredCompletions: Int {
        return entity.numRequiredCompletions ?? 0
    }
}

class EntityListModel: ObservableObject {
    @Published
    private var entityViewModels: [EntityViewModel] = []

    @Published
    private var entitiesFromServer: Entities = .init(entities: [], entityIdToIsDone: [:], entityIdToCompletionRatio: [:])

    // Used to stay subscribed to the sink to keep the entityViewModels up to date
    private var cancellables = Set<AnyCancellable>()

    init() {
        let timeRange = getTimeRangeForDate(Date())
        Task {
            client.subscribe(
                to: "entities:list",
                with: [
                    "timeRange": [
                        "startTimestamp": timeRange.start,
                        "endTimestamp": timeRange.end,
                    ],
                ],
                yielding: Entities.self
            )
            .handleEvents(receiveCompletion: logHandlers("entities:list"))
            .replaceError(with: Entities(entities: [], entityIdToIsDone: [:], entityIdToCompletionRatio: [:]))
            .receive(on: DispatchQueue.main)
            .assign(to: &$entitiesFromServer)
        }
        $entitiesFromServer.sink { newEntitiesFromServer in
            self.entityViewModels = newEntitiesFromServer.entities.map {
                entity in
                EntityViewModel(entity, isDone: self.isEntityDoneToday(entityId: entity._id))
            }
        }.store(in: &cancellables)
    }

    public func isEntityDoneToday(entityId: String) -> Bool {
        return entitiesFromServer.entityIdToIsDone[entityId] ?? false
    }

    public func getCompletionRatio(for entityId: String) -> CGFloat {
        return entitiesFromServer.getCompletionRatio(for: entityId)
    }

    public func getCategoryCompletionRatio(for category: EntityCategory) -> CGFloat {
        var requiredEntityCount = 0
        var hasOptionalEntity = false
        var maxOptionalCompletionPercentage: CGFloat = 0
        var totalRequiredCompletionPercentage: CGFloat = 0

        var isAnyDone = false
        var isRequiredEntityNotDone = false

        for entity in entitiesFromServer.entities {
            if entity.category == category {
                if entity.isRequiredDaily {
                    requiredEntityCount += 1
                    totalRequiredCompletionPercentage += getCompletionRatio(for: entity._id)
                } else {
                    hasOptionalEntity = true
                    maxOptionalCompletionPercentage = max(maxOptionalCompletionPercentage, getCompletionRatio(for: entity._id))
                }
                if isEntityDoneToday(entityId: entity._id) {
                    isAnyDone = true
                } else {
                    if entity.isRequiredDaily {
                        isRequiredEntityNotDone = true
                    }
                }
            }
        }
        if isAnyDone && !isRequiredEntityNotDone {
            return 1
        }
        if requiredEntityCount > 0 {
            return totalRequiredCompletionPercentage / CGFloat(requiredEntityCount)
        } else {
            if !hasOptionalEntity {
                // There are no entities?
                return 0
            }
            return maxOptionalCompletionPercentage
        }
    }

    public func getEntity(forCategory category: EntityCategory, forType: EntityType) -> EntityViewModel? {
        entityViewModels.first(where: { entityViewModel in
            entityViewModel.category == category && entityViewModel.type == forType
        })
    }

    public func getEntity(id: String) -> EntityViewModel? {
        entityViewModels.first(where: { entityViewModel in
            entityViewModel.id == id
        })
    }

    public func getEntities(forCategory category: EntityCategory) -> [EntityViewModel] {
        entityViewModels.filter { entityViewModel in
            entityViewModel.category == category
        }
    }
}
