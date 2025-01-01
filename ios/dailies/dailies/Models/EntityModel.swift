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

    func displayName() -> String {
        switch self {
        case .exercise: return "Exercise"
        case .learning: return "Learning"
        case .care: return "Care"
        case .thinking: return "Thinking"
        case .tidying: return "Tidying"
        }
    }
}

enum EntityType: String, Codable {
    case workout
    case genericCompletion
    case flashCards
}

struct Entity: Decodable, Hashable {
    let _id: String
    let ownerId: String
    let name: String
    let category: EntityCategory
    let type: EntityType
    let isRequired: Bool
    let numRequiredCompletions: Int?
    let includedEventFields: [String]?
    let resetAfterInterval: ResetInterval
}

let emptyEntity = Entity(
    _id: "",
    ownerId: "",
    name: "",
    category: .exercise,
    type: .workout,
    isRequired: false,
    numRequiredCompletions: nil,
    includedEventFields: nil,
    resetAfterInterval: .daily
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

func getColorForEntityCategory(_ entityCategory: EntityCategory) -> Color {
    switch entityCategory {
    case .care:
        return .blue
    case .learning:
        return .green
    case .exercise:
        return .purple
    case .tidying:
        return .orange
    case .thinking:
        return .red
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

    public var includedEventFields: [String]? {
        return entity.includedEventFields
    }

    public var buttonColor: Color {
        return getColorForEntityCategory(category)
    }

    public var numRequiredCompletions: Int {
        return entity.numRequiredCompletions ?? 0
    }

    public var resetInterval: ResetInterval {
        return entity.resetAfterInterval
    }
}

class EntityListModel: ObservableObject {
    @Published
    public private(set) var entityViewModels: [EntityViewModel] = []

    @Published
    private var entitiesFromServer: Entities = .init(entities: [], entityIdToIsDone: [:], entityIdToCompletionRatio: [:])

    // Used to stay subscribed to the sink to keep the entityViewModels up to date
    private var subscriptions = Set<AnyCancellable>()

    init() {
        print("Requesting entities")
        let now = Date()
        let dailyTimeRange = getDayTimeRangeForDate(now)
        let weeklyTimeRange = getWeekTimeRangeForDate(now)
        Task {
            client.subscribe(
                to: "entities:list",
                with: [
                    "dailyTimeRange": [
                        "startTimestamp": dailyTimeRange.start,
                        "endTimestamp": dailyTimeRange.end,
                    ],
                    "weeklyTimeRange": [
                        "startTimestamp": weeklyTimeRange.start,
                        "endTimestamp": weeklyTimeRange.end,
                    ],
                ],
                yielding: Entities.self
            )
            .handleEvents(
                receiveOutput: { _ in
                    // print("receiveOutput - entities:list", output)
                },
                receiveCompletion: logCompletionHandlers("entities:list")
            )
            .replaceError(with: Entities(entities: [], entityIdToIsDone: [:], entityIdToCompletionRatio: [:]))
            .receive(on: DispatchQueue.main)
            .assign(to: &$entitiesFromServer)
        }
        $entitiesFromServer.sink { [weak self] newEntitiesFromServer in
            guard let self = self else { return }
            self.entityViewModels = newEntitiesFromServer.entities.map {
                entity in
                EntityViewModel(entity, isDone: self.isEntityDoneToday(entityId: entity._id))
            }
        }.store(in: &subscriptions)
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
        var numOptionalCompletions = 0
        var maxOptionalCompletionPercentage: CGFloat = 0
        var totalRequiredCompletionPercentage: CGFloat = 0

        var isAnyDone = false
        var isRequiredEntityNotDone = false

        for entity in entitiesFromServer.entities {
            if entity.category == category {
                if entity.isRequired {
                    requiredEntityCount += 1
                    totalRequiredCompletionPercentage += getCompletionRatio(for: entity._id)
                } else {
                    hasOptionalEntity = true
                    maxOptionalCompletionPercentage = max(maxOptionalCompletionPercentage, getCompletionRatio(for: entity._id))
                }
                if isEntityDoneToday(entityId: entity._id) {
                    isAnyDone = true
                    if !entity.isRequired {
                        numOptionalCompletions += 1
                    }
                } else {
                    if entity.isRequired {
                        isRequiredEntityNotDone = true
                    }
                }
            }
        }
        if isAnyDone && !isRequiredEntityNotDone {
            return 1
        }
        if requiredEntityCount > 0 {
            // If a category has both optional and required completions,
            // we want to show the optional completions in the bar, but they
            // can never fill it up
            return (totalRequiredCompletionPercentage + CGFloat(numOptionalCompletions)) / CGFloat(requiredEntityCount + numOptionalCompletions)
        } else {
            if !hasOptionalEntity {
                // There are no entities?
                return 0
            }
            return maxOptionalCompletionPercentage
        }
    }

    public func getEntity(forCategory category: EntityCategory, forType type: EntityType) -> EntityViewModel? {
        entityViewModels.first(where: { entityViewModel in
            entityViewModel.category == category && entityViewModel.type == type
        })
    }

    public func getEntity(_ id: String?) -> EntityViewModel? {
        if id == nil {
            return nil
        }
        return entityViewModels.first(where: { entityViewModel in
            entityViewModel.id == id
        })
    }

    public func getEntities(forCategory category: EntityCategory) -> [EntityViewModel] {
        entityViewModels.filter { entityViewModel in
            entityViewModel.category == category
        }
    }
}
