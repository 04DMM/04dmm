import CategoryType from '#/cache/config/CategoryType.js';
import InvType from '#/cache/config/InvType.js';
import ObjType from '#/cache/config/ObjType.js';
import { CoordGrid } from '#/engine/CoordGrid.js';
import { EntityLifeCycle } from '#/engine/entity/EntityLifeCycle.js';
import { isClientConnected } from '#/engine/entity/NetworkPlayer.js';
import Obj from '#/engine/entity/Obj.js';
import Player from '#/engine/entity/Player.js';
import { WealthEventItem } from '#/engine/entity/tracking/WealthEvent.js';
import { Inventory } from '#/engine/Inventory.js';
import { ScriptOpcode } from '#/engine/script/ScriptOpcode.js';
import { ActiveObj, ActivePlayer, checkedHandler, ProtectedActivePlayer } from '#/engine/script/ScriptPointer.js';
import { CommandHandlers } from '#/engine/script/ScriptRunner.js';
import { CategoryTypeValid, check, CoordValid, DurationValid, InvTypeValid, NumberNotNull, ObjStackValid, ObjTypeValid } from '#/engine/script/ScriptValidators.js';
import World from '#/engine/World.js';
import { WealthEventType } from '#/server/logger/WealthEventType.js';

const InvOps: CommandHandlers = {
    // inv config
    [ScriptOpcode.INV_ALLSTOCK]: state => {
        const invType: InvType = check(state.popInt(), InvTypeValid);

        state.pushInt(invType.allstock ? 1 : 0);
    },

    // inv config
    [ScriptOpcode.INV_SIZE]: state => {
        const invType: InvType = check(state.popInt(), InvTypeValid);

        state.pushInt(invType.size);
    },

    // inv config
    [ScriptOpcode.INV_DEBUGNAME]: state => {
        const invType: InvType = check(state.popInt(), InvTypeValid);

        state.pushString(invType.debugname ?? 'null');
    },

    // inv config
    [ScriptOpcode.INV_STOCKBASE]: state => {
        const [inv, obj] = state.popInts(2);

        const invType: InvType = check(inv, InvTypeValid);
        const objType: ObjType = check(obj, ObjTypeValid);

        if (!invType.stockobj || !invType.stockcount) {
            state.pushInt(-1);
            return;
        }

        const index = invType.stockobj.indexOf(objType.id);
        state.pushInt(index >= 0 ? invType.stockcount[index] : -1);
    },

    // inv write
    [ScriptOpcode.INV_ADD]: checkedHandler(ActivePlayer, state => {
        const [inv, objId, count] = state.popInts(3);

        const invType: InvType = check(inv, InvTypeValid);
        const objType: ObjType = check(objId, ObjTypeValid);
        check(count, ObjStackValid);

        if (!state.pointerGet(ProtectedActivePlayer[state.intOperand]) && invType.protect && invType.scope !== InvType.SCOPE_SHARED) {
            throw new Error(`$inv requires protected access: ${invType.debugname}`);
        }

        if (!invType.dummyinv && objType.dummyitem !== 0) {
            throw new Error(`dummyitem in non-dummyinv: ${objType.debugname} -> ${invType.debugname}`);
        }

        const player = state.activePlayer;
        const overflow = count - player.invAdd(invType.id, objType.id, count, false);
        if (overflow > 0) {
            if (!objType.stackable || overflow === 1) {
                for (let i = 0; i < overflow; i++) {
                    World.addObj(new Obj(player.level, player.x, player.z, EntityLifeCycle.DESPAWN, objType.id, 1), player.hash64, 200);
                }
            } else {
                World.addObj(new Obj(player.level, player.x, player.z, EntityLifeCycle.DESPAWN, objType.id, overflow), player.hash64, 200);
            }
        }
    }),

    // inv write
    [ScriptOpcode.INV_CHANGESLOT]: checkedHandler(ActivePlayer, state => {
        const [inv, find, replace, replaceCount] = state.popInts(4);

        const invType: InvType = check(inv, InvTypeValid);

        if (!state.pointerGet(ProtectedActivePlayer[state.intOperand]) && invType.protect && invType.scope !== InvType.SCOPE_SHARED) {
            throw new Error(`$inv requires protected access: ${invType.debugname}`);
        }

        const findObj: ObjType = check(find, ObjTypeValid);
        const replaceObj: ObjType = check(replace, ObjTypeValid);
        const fromInv = state.activePlayer.getInventory(inv);

        if (!fromInv) {
            throw new Error('inv is null');
        }

        for (let slot = 0; slot < fromInv.capacity; slot++) {
            const obj = fromInv.get(slot);
            if (!obj) {
                continue;
            }
            if (obj.id === findObj.id) {
                state.activePlayer.invSet(invType.id, replaceObj.id, replaceCount, slot);
                return;
            }
        }
    }),

    // inv write
    [ScriptOpcode.INV_CLEAR]: checkedHandler(ActivePlayer, state => {
        const invType: InvType = check(state.popInt(), InvTypeValid);

        if (!state.pointerGet(ProtectedActivePlayer[state.intOperand]) && invType.protect && invType.scope !== InvType.SCOPE_SHARED) {
            throw new Error(`$inv requires protected access: ${invType.debugname}`);
        }

        state.activePlayer.invClear(invType.id);
    }),

    // https://x.com/JagexAsh/status/1679942100249464833
    // https://x.com/JagexAsh/status/1708084689141895625
    // inv write
    [ScriptOpcode.INV_DEL]: checkedHandler(ActivePlayer, state => {
        const [inv, obj, count] = state.popInts(3);

        const invType: InvType = check(inv, InvTypeValid);
        const objType: ObjType = check(obj, ObjTypeValid);
        check(count, ObjStackValid);

        if (!state.pointerGet(ProtectedActivePlayer[state.intOperand]) && invType.protect && invType.scope !== InvType.SCOPE_SHARED) {
            throw new Error(`$inv requires protected access: ${invType.debugname}`);
        }

        state.activePlayer.invDel(invType.id, objType.id, count);
    }),

    // inv write
    [ScriptOpcode.INV_DELSLOT]: checkedHandler(ActivePlayer, state => {
        const [inv, slot] = state.popInts(2);

        const invType: InvType = check(inv, InvTypeValid);

        if (!state.pointerGet(ProtectedActivePlayer[state.intOperand]) && invType.protect && invType.scope !== InvType.SCOPE_SHARED) {
            throw new Error(`$inv requires protected access: ${invType.debugname}`);
        }

        const obj = state.activePlayer.invGetSlot(invType.id, slot);
        if (!obj) {
            return;
        }

        state.activePlayer.invDelSlot(invType.id, slot);
    }),

    // https://x.com/JagexAsh/status/1679942100249464833
    // inv write
    [ScriptOpcode.INV_DROPITEM]: checkedHandler(ActivePlayer, state => {
        const [inv, coord, obj, count, duration] = state.popInts(5);

        const invType: InvType = check(inv, InvTypeValid);
        const position: CoordGrid = check(coord, CoordValid);
        const objType: ObjType = check(obj, ObjTypeValid);
        check(count, ObjStackValid);
        check(duration, DurationValid);

        if (!state.pointerGet(ProtectedActivePlayer[state.intOperand]) && invType.protect && invType.scope !== InvType.SCOPE_SHARED) {
            throw new Error(`$inv requires protected access: ${invType.debugname}`);
        }

        const player = state.activePlayer;
        const completed = player.invDel(invType.id, objType.id, count);
        if (completed == 0) {
            return;
        }

        const floorObj: Obj = new Obj(position.level, position.x, position.z, EntityLifeCycle.DESPAWN, objType.id, completed);
        World.addObj(floorObj, player.hash64, duration);
        state.activeObj = floorObj;
        state.pointerAdd(ActiveObj[state.intOperand]);
    }),

    // https://x.com/JagexAsh/status/1679942100249464833
    // inv write
    [ScriptOpcode.INV_DROPSLOT]: checkedHandler(ActivePlayer, state => {
        const [inv, coord, slot, duration] = state.popInts(4);

        const invType: InvType = check(inv, InvTypeValid);
        check(duration, DurationValid);
        const position: CoordGrid = check(coord, CoordValid);

        if (!state.pointerGet(ProtectedActivePlayer[state.intOperand]) && invType.protect && invType.scope !== InvType.SCOPE_SHARED) {
            throw new Error(`$inv requires protected access: ${invType.debugname}`);
        }

        const obj = state.activePlayer.invGetSlot(invType.id, slot);
        if (!obj) {
            throw new Error('$slot is empty');
        }

        const objType = ObjType.get(obj.id);
        if (invType.scope === InvType.SCOPE_PERM) {
            // ammo drops are temp, without checking scope this spams in ranged combat
            state.activePlayer.addWealthLog(-(obj.count * objType.cost), `Dropped ${objType.debugname} x${obj.count}`);
            state.activePlayer.addWealthEvent({
                event_type: WealthEventType.DROP, 
                account_items: [{ id: obj.id, name: objType.debugname, count: obj.count }], 
                account_value: (obj.count * objType.cost)
            });
        }

        const player = state.activePlayer;
        const completed = player.invDel(invType.id, obj.id, obj.count, slot);
        if (completed === 0) {
            return;
        }

        if (!objType.stackable || completed === 1) {
            for (let i = 0; i < completed; i++) {
                const floorObj: Obj = new Obj(position.level, position.x, position.z, EntityLifeCycle.DESPAWN, obj.id, 1);
                World.addObj(floorObj, player.hash64, duration);

                state.activeObj = floorObj;
                state.pointerAdd(ActiveObj[state.intOperand]);
            }
        } else {
            const floorObj: Obj = new Obj(position.level, position.x, position.z, EntityLifeCycle.DESPAWN, obj.id, completed);
            World.addObj(floorObj, player.hash64, duration);

            state.activeObj = floorObj;
            state.pointerAdd(ActiveObj[state.intOperand]);
        }
    }),

    // inv read
    [ScriptOpcode.INV_FREESPACE]: checkedHandler(ActivePlayer, state => {
        const invType: InvType = check(state.popInt(), InvTypeValid);

        state.pushInt(state.activePlayer.invFreeSpace(invType.id));
    }),

    // inv read
    [ScriptOpcode.INV_GETNUM]: checkedHandler(ActivePlayer, state => {
        const [inv, slot] = state.popInts(2);

        const invType: InvType = check(inv, InvTypeValid);
        state.pushInt(state.activePlayer.invGetSlot(invType.id, slot)?.count ?? 0);
    }),

    // inv read
    [ScriptOpcode.INV_GETOBJ]: checkedHandler(ActivePlayer, state => {
        const [inv, slot] = state.popInts(2);

        const invType: InvType = check(inv, InvTypeValid);
        state.pushInt(state.activePlayer.invGetSlot(invType.id, slot)?.id ?? -1);
    }),

    // inv read
    [ScriptOpcode.INV_ITEMSPACE]: checkedHandler(ActivePlayer, state => {
        const [inv, obj, count, size] = state.popInts(4);

        if (count === 0) {
            state.pushInt(0);
            return;
        }

        const invType: InvType = check(inv, InvTypeValid);
        const objType: ObjType = check(obj, ObjTypeValid);
        check(count, ObjStackValid);

        if (size < 0 || size > invType.size) {
            throw new Error(`$count is out of range: ${count}`);
        }

        state.pushInt(state.activePlayer.invItemSpace(invType.id, objType.id, count, size) === 0 ? 1 : 0);
    }),

    // inv read
    [ScriptOpcode.INV_ITEMSPACE2]: checkedHandler(ActivePlayer, state => {
        const [inv, obj, count, size] = state.popInts(4);

        if (count === 0) {
            state.pushInt(0);
            return;
        }

        const invType: InvType = check(inv, InvTypeValid);
        const objType: ObjType = check(obj, ObjTypeValid);
        check(count, ObjStackValid);

        state.pushInt(state.activePlayer.invItemSpace(invType.id, objType.id, count, size));
    }),

    // https://x.com/JagexAsh/status/1706983568805704126
    // inv write
    [ScriptOpcode.INV_MOVEFROMSLOT]: checkedHandler(ActivePlayer, state => {
        const [fromInv, toInv, fromSlot] = state.popInts(3);

        const fromInvType: InvType = check(fromInv, InvTypeValid);
        const toInvType: InvType = check(toInv, InvTypeValid);

        if (!state.pointerGet(ProtectedActivePlayer[state.intOperand]) && fromInvType.protect && fromInvType.scope !== InvType.SCOPE_SHARED) {
            throw new Error(`$inv requires protected access: ${fromInvType.debugname}`);
        }

        if (!state.pointerGet(ProtectedActivePlayer[state.intOperand]) && toInvType.protect && fromInvType.scope !== InvType.SCOPE_SHARED) {
            throw new Error(`$inv requires protected access: ${toInvType.debugname}`);
        }

        const player = state.activePlayer;
        const { overflow, fromObj } = player.invMoveFromSlot(fromInvType.id, toInvType.id, fromSlot);
        if (overflow > 0) {
            const objType: ObjType = ObjType.get(fromObj);
            if (!objType.stackable || overflow === 1) {
                for (let i = 0; i < overflow; i++) {
                    World.addObj(new Obj(player.level, player.x, player.z, EntityLifeCycle.DESPAWN, fromObj, 1), player.hash64, 200);
                }
            } else {
                World.addObj(new Obj(player.level, player.x, player.z, EntityLifeCycle.DESPAWN, fromObj, overflow), player.hash64, 200);
            }
        }
    }),

    // https://x.com/JagexAsh/status/1706983568805704126
    // inv write
    [ScriptOpcode.INV_MOVETOSLOT]: checkedHandler(ActivePlayer, state => {
        const [fromInv, toInv, fromSlot, toSlot] = state.popInts(4);

        const fromInvType: InvType = check(fromInv, InvTypeValid);
        const toInvType: InvType = check(toInv, InvTypeValid);

        if (!state.pointerGet(ProtectedActivePlayer[state.intOperand]) && fromInvType.protect && fromInvType.scope !== InvType.SCOPE_SHARED) {
            throw new Error(`$inv requires protected access: ${fromInvType.debugname}`);
        }

        if (!state.pointerGet(ProtectedActivePlayer[state.intOperand]) && toInvType.protect && fromInvType.scope !== InvType.SCOPE_SHARED) {
            throw new Error(`$inv requires protected access: ${toInvType.debugname}`);
        }

        state.activePlayer.invMoveToSlot(fromInvType.id, toInvType.id, fromSlot, toSlot);
    }),

    // https://x.com/JagexAsh/status/1681295591639248897
    // https://x.com/JagexAsh/status/1799020087086903511
    // inv write
    [ScriptOpcode.BOTH_MOVEINV]: checkedHandler(ActivePlayer, state => {
        const [from, to] = state.popInts(2);

        const fromInvType: InvType = check(from, InvTypeValid);
        const toInvType: InvType = check(to, InvTypeValid);

        const secondary = state.intOperand == 1;

        // move the contents of the `from` inventory into the `to` inventory between both players
        // from = active_player
        // to = .active_player
        // if both_moveinv is called as .both_moveinv, then from/to pointers are swapped

        const fromPlayer = secondary ? state._activePlayer2 : state._activePlayer;
        const toPlayer = secondary ? state._activePlayer : state._activePlayer2;

        if (!fromPlayer || !toPlayer) {
            throw new Error('player is null');
        }

        if (!state.pointerGet(ProtectedActivePlayer[secondary ? 1 : 0]) && fromInvType.protect && fromInvType.scope !== InvType.SCOPE_SHARED) {
            throw new Error(`$from_inv requires protected access: ${fromInvType.debugname}`);
        }

        if (!state.pointerGet(ProtectedActivePlayer[secondary ? 0 : 1]) && toInvType.protect && fromInvType.scope !== InvType.SCOPE_SHARED) {
            throw new Error(`$to_inv requires protected access: ${toInvType.debugname}`);
        }

        const fromInv = fromPlayer.getInventory(from);
        const toInv = toPlayer.getInventory(to);

        if (!fromInv || !toInv) {
            throw new Error('inv is null');
        }

        let fromTotal = 0;
        // Holds a record of the wealth for logging only
        const fromLogs: Map<number, WealthEventItem & { cost: number }> = new Map();

        // we're going to assume the content has made sure this will go as expected
        for (let slot = 0; slot < fromInv.capacity; slot++) {
            const obj = fromInv.get(slot);
            if (!obj) {
                continue;
            }

            fromInv.delete(slot);

            const count = obj.count;
            const type = ObjType.get(obj.id);
            const overflow = count - toPlayer.invAdd(toInv.type, type.id, count, false);
            if (overflow > 0) {
                if (!type.stackable || overflow === 1) {
                    for (let i = 0; i < overflow; i++) {
                        World.addObj(new Obj(toPlayer.level, toPlayer.x, toPlayer.z, EntityLifeCycle.DESPAWN, type.id, 1), toPlayer.hash64, 200);
                    }
                } else {
                    World.addObj(new Obj(toPlayer.level, toPlayer.x, toPlayer.z, EntityLifeCycle.DESPAWN, type.id, overflow), toPlayer.hash64, 200);
                }
            }

            const event = fromLogs.get(type.id);
            if (event) {
                event.count += obj.count;
            }
            else {
                fromLogs.set(obj.id, { id: obj.id, name: type.debugname, count: obj.count, cost: type.cost });
            }

            fromTotal += type.cost * obj.count;
        }

        for (const toLog of fromLogs.values()) {
            // Log all wealth events
            const totalValueGp = toLog.cost * toLog.count;
            fromPlayer.addWealthLog(-totalValueGp, 'Gave ' + toLog.name + ' x' + toLog.count + ' to ' + toPlayer.username);
            toPlayer.addWealthLog(totalValueGp, 'Received ' + toLog.name + ' x' + toLog.count + ' from ' + fromPlayer.username);
        }

        const toSession = isClientConnected(toPlayer) ? toPlayer.client.uuid : 'disconnected';
        const fromItems = Array.from(fromLogs.values().map(item => (({ cost: _cost, ...event }) => event)(item)));

        // Log wealth events
        if (fromInvType.debugname === 'stakeinv') {
            if (fromItems.length > 0) {
                fromPlayer.addWealthEvent({
                    event_type: WealthEventType.STAKE, 
                    account_items: fromItems, 
                    account_value: fromTotal, 
                    recipient_id: toPlayer.account_id, 
                    recipient_session: toSession
                });
            }
        }
        else if (!secondary) {
            let toTotal = 0;
            const toLogs: Map<number, WealthEventItem> = new Map();

            // log opposite side of trade
            const tradeInv = toPlayer.getInventory(from);
            if (tradeInv) {       
                for (let slot = 0; slot < tradeInv.capacity; slot++) {
                    const obj = tradeInv.get(slot);
                    if (!obj) {
                        continue;
                    }   
                    
                    const type = ObjType.get(obj.id);
                    const event = toLogs.get(type.id);
                    if (event) {
                        event.count += obj.count;
                    }
                    else {
                        toLogs.set(obj.id, { id: obj.id, name: type.debugname, count: obj.count });
                    }
                    toTotal += type.cost * obj.count;
                }
            }
            
            if (fromItems.length > 0 || toLogs.size > 0) {
                const toItems = Array.from(toLogs.values());
                fromPlayer.addWealthEvent({
                    event_type: WealthEventType.TRADE, 
                    account_items: fromItems, 
                    account_value: fromTotal, 
                    recipient_id: toPlayer.account_id, 
                    recipient_session: toSession, 
                    recipient_items: toItems, 
                    recipient_value: toTotal
                });
            }
        }
    }),

    // https://x.com/TheCrazy0neTv/status/1681181722811957248
    // inv write
    [ScriptOpcode.INV_MOVEITEM]: checkedHandler(ActivePlayer, state => {
        const [fromInv, toInv, obj, count] = state.popInts(4);

        const fromInvType: InvType = check(fromInv, InvTypeValid);
        const toInvType: InvType = check(toInv, InvTypeValid);
        const objType: ObjType = check(obj, ObjTypeValid);
        check(count, ObjStackValid);

        if (!state.pointerGet(ProtectedActivePlayer[state.intOperand]) && fromInvType.protect && fromInvType.scope !== InvType.SCOPE_SHARED) {
            throw new Error(`$inv requires protected access: ${fromInvType.debugname}`);
        }

        if (!state.pointerGet(ProtectedActivePlayer[state.intOperand]) && toInvType.protect && fromInvType.scope !== InvType.SCOPE_SHARED) {
            throw new Error(`$inv requires protected access: ${toInvType.debugname}`);
        }

        const player: Player = state.activePlayer;
        const completed = player.invDel(fromInvType.id, objType.id, count);
        if (completed == 0) {
            return;
        }

        const overflow = count - player.invAdd(toInvType.id, objType.id, completed, false);
        if (overflow > 0) {
            if (!objType.stackable || overflow === 1) {
                for (let i = 0; i < overflow; i++) {
                    World.addObj(new Obj(player.level, player.x, player.z, EntityLifeCycle.DESPAWN, objType.id, 1), player.hash64, 200);
                }
            } else {
                World.addObj(new Obj(player.level, player.x, player.z, EntityLifeCycle.DESPAWN, objType.id, overflow), player.hash64, 200);
            }
        }
    }),

    // https://x.com/JagexAsh/status/1681616480763367424
    // inv write
    [ScriptOpcode.INV_MOVEITEM_CERT]: checkedHandler(ActivePlayer, state => {
        const [fromInv, toInv, obj, count] = state.popInts(4);

        const fromInvType = check(fromInv, InvTypeValid);
        const toInvType = check(toInv, InvTypeValid);
        const objType = check(obj, ObjTypeValid);
        check(count, ObjStackValid);

        if (!state.pointerGet(ProtectedActivePlayer[state.intOperand]) && fromInvType.protect && fromInvType.scope !== InvType.SCOPE_SHARED) {
            throw new Error(`$inv requires protected access: ${fromInvType.debugname}`);
        }

        if (!state.pointerGet(ProtectedActivePlayer[state.intOperand]) && toInvType.protect && fromInvType.scope !== InvType.SCOPE_SHARED) {
            throw new Error(`$inv requires protected access: ${toInvType.debugname}`);
        }

        const player: Player = state.activePlayer;
        const completed = player.invDel(fromInvType.id, objType.id, count);
        if (completed == 0) {
            return;
        }

        let finalObj = objType.id;
        if (objType.certtemplate === -1 && objType.certlink >= 0) {
            finalObj = objType.certlink;
        }
        const overflow = count - player.invAdd(toInvType.id, finalObj, completed, false);
        if (overflow > 0) {
            // should be a stackable cert already!
            World.addObj(new Obj(player.level, player.x, player.z, EntityLifeCycle.DESPAWN, finalObj, overflow), player.hash64, 200);
        }
    }),

    // https://x.com/JagexAsh/status/1681616480763367424
    // inv write
    [ScriptOpcode.INV_MOVEITEM_UNCERT]: checkedHandler(ActivePlayer, state => {
        const [fromInv, toInv, obj, count] = state.popInts(4);

        const fromInvType: InvType = check(fromInv, InvTypeValid);
        const toInvType: InvType = check(toInv, InvTypeValid);
        const objType: ObjType = check(obj, ObjTypeValid);
        check(count, ObjStackValid);

        if (!state.pointerGet(ProtectedActivePlayer[state.intOperand]) && fromInvType.protect && fromInvType.scope !== InvType.SCOPE_SHARED) {
            throw new Error(`$inv requires protected access: ${fromInvType.debugname}`);
        }

        if (!state.pointerGet(ProtectedActivePlayer[state.intOperand]) && toInvType.protect && fromInvType.scope !== InvType.SCOPE_SHARED) {
            throw new Error(`$inv requires protected access: ${toInvType.debugname}`);
        }

        const player: Player = state.activePlayer;
        const completed = player.invDel(fromInvType.id, objType.id, count);
        if (completed == 0) {
            return;
        }

        if (objType.certtemplate >= 0 && objType.certlink >= 0) {
            player.invAdd(toInvType.id, objType.certlink, completed);
        } else {
            player.invAdd(toInvType.id, objType.id, completed);
        }
    }),

    // inv write
    [ScriptOpcode.INV_SETSLOT]: checkedHandler(ActivePlayer, state => {
        const [inv, slot, objId, count] = state.popInts(4);

        const invType: InvType = check(inv, InvTypeValid);
        const objType: ObjType = check(objId, ObjTypeValid);
        check(count, ObjStackValid);

        if (!state.pointerGet(ProtectedActivePlayer[state.intOperand]) && invType.protect && invType.scope !== InvType.SCOPE_SHARED) {
            throw new Error(`$inv requires protected access: ${invType.debugname}`);
        }

        if (!invType.dummyinv && objType.dummyitem !== 0) {
            throw new Error(`dummyitem in non-dummyinv: ${objType.debugname} -> ${invType.debugname}`);
        }

        state.activePlayer.invSet(invType.id, objType.id, count, slot);
    }),

    // inv read
    [ScriptOpcode.INV_TOTAL]: checkedHandler(ActivePlayer, state => {
        const [inv, obj] = state.popInts(2);

        const invType: InvType = check(inv, InvTypeValid);

        // todo: error instead?
        if (obj === -1) {
            state.pushInt(0);
            return;
        }

        state.pushInt(state.activePlayer.invTotal(invType.id, obj));
    }),

    // inv read
    [ScriptOpcode.INV_TOTALCAT]: checkedHandler(ActivePlayer, state => {
        const [inv, category] = state.popInts(2);

        const invType: InvType = check(inv, InvTypeValid);
        const catType: CategoryType = check(category, CategoryTypeValid);

        state.pushInt(state.activePlayer.invTotalCat(invType.id, catType.id));
    }),

    // inv protocol
    [ScriptOpcode.INV_TRANSMIT]: checkedHandler(ActivePlayer, state => {
        const [inv, com] = state.popInts(2);

        const invType: InvType = check(inv, InvTypeValid);
        check(com, NumberNotNull);

        state.activePlayer.invListenOnCom(invType.id, com, state.activePlayer.uid);
    }),

    // inv protocol
    [ScriptOpcode.INVOTHER_TRANSMIT]: checkedHandler(ActivePlayer, state => {
        const [uid, inv, com] = state.popInts(3);

        check(uid, NumberNotNull);
        const invType: InvType = check(inv, InvTypeValid);
        check(com, NumberNotNull);

        state.activePlayer.invListenOnCom(invType.id, com, uid);
    }),

    // inv protocol
    [ScriptOpcode.INV_STOPTRANSMIT]: checkedHandler(ActivePlayer, state => {
        const com = check(state.popInt(), NumberNotNull);

        state.activePlayer.invStopListenOnCom(com);
    }),

    // inv write
    [ScriptOpcode.BOTH_DROPSLOT]: checkedHandler(ActivePlayer, state => {
        const [inv, coord, slot, duration] = state.popInts(4);

        const invType: InvType = check(inv, InvTypeValid);
        check(duration, DurationValid);
        const position: CoordGrid = check(coord, CoordValid);

        const secondary = state.intOperand == 1;

        // from = active_player
        // to = .active_player
        // if both_dropslot is called as .both_dropslot, then from/to pointers are swapped

        const fromPlayer: Player | null = secondary ? state._activePlayer2 : state._activePlayer;
        const toPlayer: Player | null = secondary ? state._activePlayer : state._activePlayer2;

        if (!fromPlayer || !toPlayer) {
            throw new Error('player is null');
        }

        if (!state.pointerGet(ProtectedActivePlayer[secondary ? 1 : 0]) && invType.protect && invType.scope !== InvType.SCOPE_SHARED) {
            throw new Error(`inv requires protected access: ${invType.debugname}`);
        }

        const obj = fromPlayer.invGetSlot(invType.id, slot);
        if (!obj) {
            throw new Error('$slot is empty');
        }

        const objType: ObjType = ObjType.get(obj.id);
        if (invType.scope === InvType.SCOPE_PERM) {
            const value = obj.count * objType.cost;
            state.activePlayer.addWealthLog(-(value), `Dropped ${objType.debugname} x${obj.count}`);
            
            const p2Session = isClientConnected(toPlayer) ? toPlayer.client.uuid : 'disconnected';
            state.activePlayer.addWealthEvent({
                event_type: WealthEventType.PVP, 
                account_items: [{ id: obj.id, name: objType.debugname, count: obj.count }], 
                account_value: (obj.count * objType.cost), 
                recipient_id: toPlayer.account_id, 
                recipient_session: p2Session
            });
        }

        const completed: number = fromPlayer.invDel(invType.id, obj.id, obj.count, slot);
        if (completed === 0) {
            return;
        }

        // Untradeables will drop as well on PK
        //if (!objType.tradeable) {
        //    return; // stop untradables after delete.
        //}

        World.addObj(new Obj(position.level, position.x, position.z, EntityLifeCycle.DESPAWN, obj.id, completed), toPlayer.hash64, duration);
    }),

    // https://x.com/JagexAsh/status/1778879334167548366
    // inv write
    [ScriptOpcode.INV_DROPALL]: checkedHandler(ActivePlayer, state => {
        const [inv, coord, duration] = state.popInts(3);

        const invType: InvType = check(inv, InvTypeValid);
        check(duration, DurationValid);
        const position: CoordGrid = check(coord, CoordValid);

        if (!state.pointerGet(ProtectedActivePlayer[state.intOperand]) && invType.protect && invType.scope !== InvType.SCOPE_SHARED) {
            throw new Error(`$inv requires protected access: ${invType.debugname}`);
        }

        const inventory: Inventory | null = state.activePlayer.getInventory(invType.id);
        if (!inventory) {
            return;
        }

        let totalValue = 0;
        // Holds a record of the wealth for logging only
        const wealthLog: Map<number, WealthEventItem & { cost: number }> = new Map();
        for (let slot: number = 0; slot < inventory.capacity; slot++) {
            const obj = inventory.get(slot);
            if (!obj) {
                continue;
            }

            const objType: ObjType = ObjType.get(obj.id);

            if (invType.scope === InvType.SCOPE_PERM) {

                const event = wealthLog.get(obj.id);
                if (event) {
                    event.count += obj.count;
                }
                else {
                    wealthLog.set(obj.id, { id: obj.id, name: objType.debugname, count: obj.count, cost: objType.cost });
                }
                
                totalValue += obj.count * objType.cost; 
            }

            inventory.delete(slot);

            if (!objType.tradeable) {
                continue; // stop untradables after delete.
            }

            World.addObj(new Obj(position.level, position.x, position.z, EntityLifeCycle.DESPAWN, obj.id, obj.count), Obj.NO_RECEIVER, duration);
        }
        for (const toLog of wealthLog.values()) {
            // Log all wealth events
            const totalValueGp = toLog.cost * toLog.count;
            state.activePlayer.addWealthLog(-totalValueGp, `Dropped ${toLog.name} x${toLog.count}`);
        }

        if (wealthLog.size > 0) {
            const items = Array.from(wealthLog.values().map(item => (({ cost: _cost, ...event }) => event)(item)));
            state.activePlayer.addWealthEvent({
                event_type: WealthEventType.DEATH,
                account_items: items,
                account_value: totalValue
            });
        }
    }),

    [ScriptOpcode.INV_TOTALPARAM]: checkedHandler(ActivePlayer, state => {
        const [inv, param] = state.popInts(2);

        state.pushInt(state.activePlayer.invTotalParam(inv, param));
    }),

    [ScriptOpcode.INV_TOTALPARAM_STACK]: checkedHandler(ActivePlayer, state => {
        const [inv, param] = state.popInts(2);

        state.pushInt(state.activePlayer.invTotalParamStack(inv, param));
    })
};

export default InvOps;
