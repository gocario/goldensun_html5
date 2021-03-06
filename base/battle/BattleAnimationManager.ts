import {GoldenSun} from "../GoldenSun";
import {BattleAnimation} from "./BattleAnimation";

export enum animation_availability {
    AVAILABLE,
    NOT_AVAILABLE,
    NO_ANIMATION,
}

const ANIMATIONS_BASE_PATH = "assets/images/abilities_animations/";
const ANIMATIONS_DB_PATH = "assets/dbs/abilities_animations/";
const ANIMATION_SUFFIX = "_battle_animation";
const RECIPE_SUFFIX = "_battle_recipe";

export class BattleAnimationManager {
    public game: Phaser.Game;
    public data: GoldenSun;
    public animations: {[key: string]: BattleAnimation};
    public not_available: Set<string>;
    public render_function: Function;

    constructor(game, data) {
        this.game = game;
        this.data = data;
        this.animations = {};
        this.not_available = new Set();
        this.render_function = null;
    }

    async load_animation(battle_anim_key, caster_battle_key, mirrored_animation) {
        if (this.not_available.has(battle_anim_key) || battle_anim_key === "no_animation") {
            return;
        }
        const sprite_key = battle_anim_key + ANIMATION_SUFFIX;
        const recipe_key = battle_anim_key + RECIPE_SUFFIX;
        const sprite_loader = this.game.load.atlasJSONHash(
            sprite_key,
            `${ANIMATIONS_BASE_PATH}${battle_anim_key}.png`,
            `${ANIMATIONS_BASE_PATH}${battle_anim_key}.json`
        );
        const recipe_loader = this.game.load.json(recipe_key, `${ANIMATIONS_DB_PATH}${battle_anim_key}_db.json`);

        let all_succeed = true;
        let sprite_loader_promise_resolve;
        const sprite_loader_promise = new Promise(resolve => {
            sprite_loader_promise_resolve = resolve;
        });
        sprite_loader.onFileComplete.addOnce((progress, filekey, success) => {
            all_succeed = all_succeed && success;
            sprite_loader_promise_resolve();
        });
        let recipe_loader_promise_resolve;
        const recipe_loader_promise = new Promise(resolve => {
            recipe_loader_promise_resolve = resolve;
        });
        recipe_loader.onFileComplete.addOnce((progress, filekey, success) => {
            all_succeed = all_succeed && success;
            recipe_loader_promise_resolve();
        });

        let load_complete_promise_resolve;
        const load_complete_promise = new Promise(resolve => (load_complete_promise_resolve = resolve));
        this.game.load.onLoadComplete.addOnce(load_complete_promise_resolve);
        this.game.load.start();
        await Promise.all([sprite_loader_promise, recipe_loader_promise, load_complete_promise]);
        if (all_succeed) {
            const animation_recipe = this.game.cache.getJSON(battle_anim_key + RECIPE_SUFFIX);
            const key = battle_anim_key + "/" + caster_battle_key;
            this.animations[key] = new BattleAnimation(
                this.game,
                this.data,
                animation_recipe.key_name,
                animation_recipe.sprites,
                animation_recipe.x_sequence,
                animation_recipe.y_sequence,
                animation_recipe.x_ellipse_axis_factor_sequence,
                animation_recipe.y_ellipse_axis_factor_sequence,
                animation_recipe.x_scale_sequence,
                animation_recipe.y_scale_sequence,
                animation_recipe.x_anchor_sequence,
                animation_recipe.y_anchor_sequence,
                animation_recipe.alpha_sequence,
                animation_recipe.rotation_sequence,
                animation_recipe.stage_angle_sequence,
                animation_recipe.hue_angle_sequence,
                animation_recipe.tint_sequence,
                animation_recipe.grayscale_sequence,
                animation_recipe.colorize_sequence,
                animation_recipe.custom_filter_sequence,
                animation_recipe.play_sequence,
                animation_recipe.set_frame_sequence,
                animation_recipe.blend_mode_sequence,
                animation_recipe.particles_sequence,
                mirrored_animation
            );
        } else {
            this.not_available.add(battle_anim_key);
        }
    }

    animation_available(battle_anim_key, caster_battle_key) {
        const key = battle_anim_key + "/" + caster_battle_key;
        if (key in this.animations) return animation_availability.AVAILABLE;
        else if (battle_anim_key === "no_animation") return animation_availability.NO_ANIMATION;
        else return animation_availability.NOT_AVAILABLE;
    }

    async play(
        battle_anim_key,
        caster_battle_key,
        caster_sprite,
        targets_sprites,
        group_caster,
        group_taker,
        battle_stage
    ) {
        const key = battle_anim_key + "/" + caster_battle_key;
        if (!(key in this.animations)) return;
        const sprite_key = battle_anim_key + ANIMATION_SUFFIX;
        this.animations[key].initialize(
            sprite_key,
            caster_sprite,
            targets_sprites,
            group_caster,
            group_taker,
            battle_stage.battle_group,
            battle_stage.camera_angle,
            [battle_stage.battle_bg, battle_stage.battle_bg2]
        );
        let play_promise_resolve;
        const play_promise = new Promise(resolve => {
            play_promise_resolve = resolve;
        });
        this.render_function = this.animations[key].render.bind(this.animations[key]);
        this.animations[key].play(play_promise_resolve);
        await play_promise;
        this.render_function = null;
        delete this.animations[key];
    }

    render() {
        if (this.render_function) {
            this.render_function();
        }
    }

    destroy() {
        for (let key in this.animations) {
            const battle_anim_key = key.split("/")[0];
            this.game.cache.removeTextureAtlas(battle_anim_key + ANIMATION_SUFFIX);
            this.game.cache.removeJSON(battle_anim_key + RECIPE_SUFFIX);
        }
    }
}
