import {GoldenSun} from "../GoldenSun";
import {InteractableObjects} from "../InteractableObjects";
import {get_directions, map_directions, split_direction} from "../utils";
import * as _ from "lodash";

export enum event_types {
    CLIMB = "climb",
    SPEED = "speed",
    TELEPORT = "teleport",
    JUMP = "jump",
    STEP = "step",
    COLLISION = "collision",
    SLIDER = "slider",
    EVENT_TRIGGER = "event_trigger",
    ICE_SLIDE = "ice_slide",
}

export abstract class TileEvent {
    public game: Phaser.Game;
    public data: GoldenSun;
    public type: event_types;
    public x: number;
    public y: number;
    public location_key: string;
    public id: number;
    public activation_collision_layers: number[];
    public activation_directions: number[];
    public dynamic: boolean;
    public active: boolean[];
    public affected_by_reveal: boolean[];
    public origin_interactable_object: InteractableObjects;
    public collision_layer_shift_from_source: number;
    public static id_incrementer: number;
    public static events: {[id: number]: TileEvent};

    constructor(
        game,
        data,
        type,
        x,
        y,
        activation_directions,
        activation_collision_layers,
        dynamic,
        active,
        origin_interactable_object,
        affected_by_reveal
    ) {
        this.game = game;
        this.data = data;
        this.type = type;
        this.x = x;
        this.y = y;
        this.location_key = TileEvent.get_location_key(this.x, this.y);
        this.id = TileEvent.id_incrementer++;
        (activation_collision_layers = activation_collision_layers ? activation_collision_layers : [0]),
            (this.activation_collision_layers = Array.isArray(activation_collision_layers)
                ? activation_collision_layers
                : [activation_collision_layers]);
        activation_directions = map_directions(activation_directions);
        if (activation_directions === undefined || activation_directions === "all") {
            activation_directions = get_directions(true);
        }
        this.activation_directions = Array.isArray(activation_directions)
            ? activation_directions
            : [activation_directions];
        this.dynamic = dynamic;
        this.active = Array.isArray(active)
            ? active
            : new Array(this.activation_directions.length).fill(active === undefined ? true : active);
        this.affected_by_reveal = Array.isArray(affected_by_reveal)
            ? affected_by_reveal
            : new Array(this.activation_directions.length).fill(
                  affected_by_reveal === undefined ? false : affected_by_reveal
              );
        this.origin_interactable_object = origin_interactable_object === undefined ? null : origin_interactable_object;
        this.collision_layer_shift_from_source = 0;
        TileEvent.events[this.id] = this;
    }

    abstract fire(): void;

    is_active(direction) {
        const possible_directions = split_direction(direction);
        for (let i = 0; i < possible_directions.length; ++i) {
            if (this.active[this.activation_directions.indexOf(possible_directions[i])]) {
                return true;
            }
        }
        return false;
    }

    activate_at(direction) {
        this.active[this.activation_directions.indexOf(direction)] = true;
    }

    deactivate_at(direction) {
        this.active[this.activation_directions.indexOf(direction)] = false;
    }

    activate() {
        this.active = this.active.map(() => true);
    }

    deactivate() {
        this.active = this.active.map(() => false);
    }

    check_position() {
        return this.data.hero.tile_x_pos === this.x && this.data.hero.tile_y_pos === this.y;
    }

    static get_location_key(x, y) {
        return `${x}_${y}`;
    }

    static get_event_by_id(events, id) {
        return _.find(events, {id: id});
    }

    static get_event(id) {
        return TileEvent.events[id];
    }

    static reset() {
        TileEvent.id_incrementer = 0;
        TileEvent.events = {};
    }
}

TileEvent.reset();
