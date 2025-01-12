//
//  ViewModel.swift
//  dailies
//
//  Created by David Wetterau on 12/1/24.
//
import Combine
import SwiftUI

enum EntityCategory: String, Codable, CaseIterable {
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

enum EventField: String, Codable {
    case weight
    case numReps
    case numSets
    case distance
    case durationSeconds

    func displayName() -> String {
        switch self {
        case .weight: "Weight"
        case .numReps: "Repetitions"
        case .numSets: "Sets"
        case .distance: "Distance"
        case .durationSeconds: "Duration"
        }
    }
}

enum EntityType: String, Codable, CaseIterable {
    case workout
    case genericCompletion
    case flashCards

    func displayName() -> String {
        switch self {
        case .workout: return "Workout"
        case .genericCompletion: return "Completions"
        case .flashCards: return "Flash Cards"
        }
    }

    func getSupportedEventFields() -> [EventField] {
        switch self {
        case .workout: return [
                .weight,
                .numReps,
                .numSets,
                .distance,
                .durationSeconds,
            ]
        case .genericCompletion: return []
        case .flashCards: return []
        }
    }
}

struct Entity: Decodable, Hashable {
    let _id: String
    let ownerId: String
    let name: String
    let category: EntityCategory
    let type: EntityType
    let isRequired: Bool
    let numRequiredCompletions: Int?
    let includedEventFields: [EventField]?
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

struct Entities: Decodable, Equatable {
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

    private var completionModelIfExists: EntityCompletionModel? = nil
    private var completionModelSubscription = Set<AnyCancellable>()
    private var eventsListViewModelIfExists: EventsListViewModel? = nil

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

    public var includedEventFields: [EventField]? {
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

    public var completionModel: EntityCompletionModel {
        if type != .genericCompletion {
            fatalError("attempted to access completionModel on non-completion entity")
        }
        if completionModelIfExists == nil {
            print("making new completion model for ", id)
            completionModelIfExists = EntityCompletionModel(self)

            completionModelIfExists!.objectWillChange.sink { [weak self] _ in
                self?.objectWillChange.send()
            }
            .store(in: &completionModelSubscription)
        }
        return completionModelIfExists!
    }

    public var eventsListViewModel: EventsListViewModel {
        if eventsListViewModelIfExists == nil {
            eventsListViewModelIfExists = EventsListViewModel(
                entityId: id,
                resetInterval: resetInterval
            )
        }
        return eventsListViewModelIfExists!
    }
}

struct EntityViewModelList {
    var entityViewModels: [EntityViewModel]
}

class EntityListModel: ObservableObject {
    @Published
    public private(set) var entityViewModels: [EntityViewModel] = []

    @Published
    public private(set) var entitiesFromServer: Entities = .init(entities: [], entityIdToIsDone: [:], entityIdToCompletionRatio: [:])

    public let dayStartTimestamp: Int

    // Used to stay subscribed to the sink to keep the entityViewModels up to date
    private var subscriptions = Set<AnyCancellable>()

    init(dayStartTimestamp: Int) {
        print("EntityListModel init() called for \(dayStartTimestamp)")
        self.dayStartTimestamp = dayStartTimestamp
        let now = getDateFromTimestamp(dayStartTimestamp)
        let dailyTimeRange = getDayTimeRangeForDate(now)
        let weeklyTimeRange = getWeekTimeRangeForDate(now)
        Task {
            print("Calling client entities:list")
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
            .sink { [weak self] newEntitiesFromServer in
                // TODO: Figure but why do we get spurious updates here
                self?.entitiesFromServer = newEntitiesFromServer
            }
            .store(in: &subscriptions)
        }
        $entitiesFromServer.sink { [weak self] newEntitiesFromServer in
            guard let self = self else { return }
            print("Got new entities in sink \(newEntitiesFromServer.entities.count)")
            if self.entitiesFromServer.entities == newEntitiesFromServer.entities {
                print("Update didn't impact entity view models, skipping")
            } else {
                print("Update did impact entity view models, re-creating")
                DispatchQueue.main.async {
                    self.entityViewModels = newEntitiesFromServer.entities.map {
                        entity in
                        EntityViewModel(entity, isDone: self.isEntityDoneToday(entityId: entity._id))
                    }
                }
            }
        }.store(in: &subscriptions)
    }

    public func cleanup() async {
        await withCheckedContinuation { continuation in
            self.subscriptions.removeAll()
            print("Cleaned up EntityListModel")
            continuation.resume()
        }
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
            // This early case is to make sure we show some progress even if an optional event is only partially done.
            let optionalNumerator = maxOptionalCompletionPercentage < 1 && maxOptionalCompletionPercentage > 0 ? maxOptionalCompletionPercentage : CGFloat(numOptionalCompletions)
            let optionalDenominator = maxOptionalCompletionPercentage < 1 && maxOptionalCompletionPercentage > 0 ? 1 : numOptionalCompletions

            return (totalRequiredCompletionPercentage + optionalNumerator) / CGFloat(requiredEntityCount + optionalDenominator)
        } else {
            if !hasOptionalEntity {
                // There are no entities?
                return 0
            }
            return maxOptionalCompletionPercentage
        }
    }

    public var areAllCategoriesComplete: Bool {
        for category in EntityCategory.allCases {
            if getCategoryCompletionRatio(for: category) < 1 {
                return false
            }
        }
        return true
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

    public func hasEntities(forCategory category: EntityCategory) -> Bool {
        return !getEntities(forCategory: category).isEmpty
    }

    public func getEntities(forCategory category: EntityCategory) -> [EntityViewModel] {
        entityViewModels.filter { entityViewModel in
            entityViewModel.category == category
        }
    }
}
