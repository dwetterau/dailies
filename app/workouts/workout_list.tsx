"use client";

import { Doc, Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { FormEvent, useCallback, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EntityType } from "@/convex/entities";
import { assert, formatTimestamp } from "@/lib/utils";
import { SelectMenu } from "@/components/ui/select";
import { flatten } from "lodash";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import { EventType } from "@/convex/events";

export function WorkoutList({ viewer }: { viewer: Id<"users"> }) {
  const [newEntityName, setNewEntityName] = useState("");
  const [newEntityType, setNewEntityType] = useState<null | EntityType>(null);
  const entities = useQuery(api.entities.list, { type: EntityType.WORKOUT });
  const createEntity = useMutation(api.entities.create);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    assert(newEntityType);
    createEntity({ name: newEntityName, type: newEntityType }).catch(
      (error) => {
        console.error("Failed to create entity:", error);
      }
    );
    setNewEntityName("");
  };

  return (
    <>
      <div className="border-b">
        <form onSubmit={handleSubmit} className="flex gap-2 p-4">
          <Input
            value={newEntityName}
            onChange={(event) => setNewEntityName(event.target.value)}
            placeholder="New entity name…"
          />
          <SelectMenu
            choices={Object.values(EntityType)}
            currentChoice={newEntityType ?? undefined}
            buttonText={"Select a type"}
            onSelect={(newValue: string) =>
              setNewEntityType(newValue as EntityType)
            }
          />
          <Button type="submit" disabled={!newEntityName}>
            Create
          </Button>
        </form>
      </div>
      {entities && (
        <ol>
          {entities.entities.map((e) => (
            <EntityRow key={e._id} entity={e} />
          ))}
        </ol>
      )}
    </>
  );
}

const EntityRow = ({
  entity: { name, type, _id },
}: {
  entity: Doc<"entities">;
}) => {
  const events = useQuery(api.events.list, { entityId: _id });
  const [isCollapsed, setIsCollapsed] = useState(true);

  const handleCollapseClick = useCallback(() => {
    setIsCollapsed((prevIsCollapsed) => !prevIsCollapsed);
  }, []);

  return (
    <div className="border-b">
      <div className="py-4 pr-4 text-secondary-foreground flex justify-between items-center">
        <span>
          <CollapseButton
            isCollapsed={isCollapsed}
            onClick={handleCollapseClick}
          />
          {name} - <span className="bg-secondary rounded p-1">{type}</span>
          {events && ` - (${events.length})`}
        </span>
        <AddEventButton entityId={_id} />
      </div>
      {!isCollapsed && (
        <div className="inline-grid grid-cols-4 auto-cols-auto auto-rows-auto gap-2 pl-10 pr-4 py-4">
          {flatten(
            events?.map((e) => [
              <div key={`${e._id}-date`}>
                {formatTimestamp(e._creationTime)}:{" "}
              </div>,
              <div key={`${e._id}-sets`}>{e.details.numSets} set(s) of</div>,
              <div key={`${e._id}-reps`}>{e.details.numReps} rep(s)</div>,
              <div key={`${e._id}-weight`}>@ {e.details.weight} lbs</div>,
            ])
          )}
        </div>
      )}
    </div>
  );
};

function CollapseButton({
  isCollapsed,
  onClick,
}: {
  isCollapsed: boolean;
  onClick: () => void;
}) {
  return (
    <Button onClick={onClick} variant={"ghost"} className="mx-2 px-2">
      {isCollapsed && <ChevronRightIcon />}
      {!isCollapsed && <ChevronDownIcon />}
    </Button>
  );
}

const AddEventButton = ({ entityId }: { entityId: Id<"entities"> }) => {
  const [isOpen, setIsOpen] = useState(false);

  const [weight, setWeight] = useState<number | undefined>(undefined);
  const createEvent = useMutation(api.events.create);

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <Button variant={"outline"}>Add Event</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded shadow-lg">
          <Dialog.Title className="text-2xl">Add a new event</Dialog.Title>
          <Dialog.Description className="pb-2">
            What did you do?
          </Dialog.Description>
          <form
            onSubmit={(event) => {
              assert(weight);
              createEvent({
                entityId,
                details: {
                  type: EventType.WORKOUT,
                  weight,
                  numReps: 1,
                  numSets: 1,
                },
              });
              setIsOpen(false);
              event.preventDefault();
            }}
          >
            <label htmlFor="weight">Weight</label>
            <Input
              name="weight"
              type="number"
              step="0.01"
              placeholder="e.g., 45"
              value={weight}
              onChange={(e) => {
                setWeight(Number(e.target.value));
              }}
            />
            <div className="flex flex-end pt-4">
              <Button type="submit" disabled={weight === undefined}>
                Save changes
              </Button>
            </div>
          </form>
          <Dialog.Close asChild>
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-[10px] right-[10px]"
              aria-label="Close"
            >
              <Cross2Icon />
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
