/* eslint-disable @typescript-eslint/naming-convention */
import { PreAkiModLoader } from "@spt-aki/loaders/PreAkiModLoader";
import { Item } from "@spt-aki/models/eft/common/tables/IItem";
import { IBarterScheme, ITraderAssort, ITraderBase } from "@spt-aki/models/eft/common/tables/ITrader";
import { ConfigTypes } from "@spt-aki/models/enums/ConfigTypes";
import { Money } from "@spt-aki/models/enums/Money";
import { JsonUtil } from "@spt-aki/utils/JsonUtil";
import { IPostDBLoadMod } from "@spt-aki/models/external/IPostDBLoadMod";
import { IPreAkiLoadMod } from "@spt-aki/models/external/IPreAkiLoadMod";
import { IRagfairConfig } from "@spt-aki/models/spt/config/IRagfairConfig";
import { ITraderConfig, UpdateTime } from "@spt-aki/models/spt/config/ITraderConfig";
import { LogTextColor } from "@spt-aki/models/spt/logging/LogTextColor";
import { IDatabaseTables } from "@spt-aki/models/spt/server/IDatabaseTables";
import { ILogger } from "@spt-aki/models/spt/utils/ILogger";
import { ImageRouter } from "@spt-aki/routers/ImageRouter";
import { ConfigServer } from "@spt-aki/servers/ConfigServer";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { StaticRouterModService } from "@spt-aki/services/mod/staticRouter/StaticRouterModService";
import { RagfairPriceService } from "@spt-aki/services/RagfairPriceService";
import { ImporterUtil } from "@spt-aki/utils/ImporterUtil";
import { DependencyContainer} from "tsyringe";
import { Traders } from "@spt-aki/models/enums/Traders";

import * as ConfigJson from "../config/config.json";
import * as AliceIllusionJson from "../db/AliceIllusion.json";
import * as QuestAssortJson from "../db/questassort.json";

class AliceIllusion implements IPreAkiLoadMod, IPostDBLoadMod 
{
    modName: string;
    logger: ILogger;
    mydb: any;

    constructor() 
    {
        this.modName = "AliceIllusion";
    }

    preAkiLoad(container: DependencyContainer): void 
    {
        this.logger = container.resolve<ILogger>("WinstonLogger");

        this.logger.debug(`[${this.modName}] preAki Loading... `);

        this.setupTraderUpdateTime(container);
        this.registerProfileImage(container);
        this.registerStaticRouter(container);
        //Chomp made me add this to get messages to work. Say "thank you." In Sicilia we say, "vaffenculo," In Espania we say, "vete a la mierda."
        Traders[AliceIllusionJson._id] = AliceIllusionJson._id;

        this.logger.debug(`[${this.modName}] preAki Loaded`);
    }

    postDBLoad(container: DependencyContainer): void 
    {
        this.logger.debug(`[${this.modName}] postDB Loading... `);

        this.loadMyDB(container);

        this.addTraderToDb(container);
        this.addTraderToLocales(
            container,
            AliceIllusionJson.name,
            "AliceIllusion",
            AliceIllusionJson.nickname,
            AliceIllusionJson.location,
            "No one knows where she comes from. No one has ever seen her real face. She calls herself Alice Illusion, and she says, “I’m just exploring.”"
        );
        this.addTraderToFleaMarket(container);
        this.addItemsToDb(container);
        this.addItemsToLocales(container);
        this.addHandbookToDb(container);
        this.addBuffsToDb(container);

        this.logger.debug(`[${this.modName}] postDB Loaded`);
        this.logger.log(`[${this.modName}] AliceIllusion Active`, LogTextColor.GREEN);
        
    }

    private setupTraderUpdateTime(container: DependencyContainer): void 
    {
        const configServer: ConfigServer = container.resolve<ConfigServer>("ConfigServer");
        const traderConfig: ITraderConfig = configServer.getConfig<ITraderConfig>(ConfigTypes.TRADER);

        const updateTime: UpdateTime = {
            _name: AliceIllusionJson.name,
            traderId: AliceIllusionJson._id,
            seconds: {
                "min": 3000,
                "max": 9000
            }
        };
        traderConfig.updateTime.push(updateTime);
    }

    private registerProfileImage(container: DependencyContainer): void 
    {
        const preAkiModLoader: PreAkiModLoader = container.resolve<PreAkiModLoader>("PreAkiModLoader");
        const imageRouter: ImageRouter = container.resolve<ImageRouter>("ImageRouter");

        const imageFilepath = `./${preAkiModLoader.getModPath(this.modName)}res`;
        imageRouter.addRoute(AliceIllusionJson.avatar.replace(".jpg", ""), `${imageFilepath}/AliceIllusion.jpg`);
    }

    private registerStaticRouter(container: DependencyContainer): void 
    {
        const staticRouterModService: StaticRouterModService = container.resolve<StaticRouterModService>("StaticRouterModService");

        staticRouterModService.registerStaticRouter(
            "AliceIllusionUpdateLogin",
            [
                {
                    url: "/launcher/profile/login",
                    action: (url: string, info: any, sessionId: string, output: string) => 
                    {
                        const databaseServer: DatabaseServer = container.resolve<DatabaseServer>("DatabaseServer");
                        const databaseTables: IDatabaseTables = databaseServer.getTables();
                        databaseTables.traders[AliceIllusionJson._id].assort = this.createAssortTable(container, sessionId);
                        return output;
                    }
                }
            ],
            "aki"
        );
        staticRouterModService.registerStaticRouter(
            "AliceIllusionUpdate",
            [
                {
                    url: "/client/game/profile/items/moving",
                    action: (url: string, info: any, sessionId: string, output: string) => 
                    {
                        if (info.data[0].Action != "Examine") 
                        {
                            const databaseServer: DatabaseServer = container.resolve<DatabaseServer>("DatabaseServer");
                            const databaseTables: IDatabaseTables = databaseServer.getTables();
                            databaseTables.traders[AliceIllusionJson._id].assort = this.createAssortTable(container, sessionId);
                        }
                        return output;
                    }
                }
            ],
            "aki"
        );
    }

    private addSingleItemToAssortWithBarterScheme(assortTable: ITraderAssort, itemTpl: string, unlimitedCount: boolean, stackCount: number, loyaltyLevel: number, barterSchemes: IBarterScheme[][]): void 
    {
        const newItem: Item = {
            _id: itemTpl,
            _tpl: itemTpl,
            parentId: "hideout",
            slotId: "hideout",
            upd: {
                UnlimitedCount: unlimitedCount,
                StackObjectsCount: stackCount
            }
        };
        assortTable.items.push(newItem);

        assortTable.barter_scheme[itemTpl] = barterSchemes;

        if (loyaltyLevel) 
        {
            assortTable.loyal_level_items[itemTpl] = loyaltyLevel;
        }
    }

    private addSingleItemToAssort(assortTable: ITraderAssort, itemTpl: string, unlimitedCount: boolean, stackCount: number, loyaltyLevel: number, currencyType: Money | string, currencyValue: number): void 
    {
        this.addSingleItemToAssortWithBarterScheme(assortTable, itemTpl, unlimitedCount, stackCount, loyaltyLevel, [
            [
                {
                    _tpl: currencyType,
                    count: currencyValue
                }
            ]
        ]);
    }


    private getPresets(container: DependencyContainer, assortTable, currency, profiles) {
        const jsonUtil = container.resolve<JsonUtil>("JsonUtil");
        const RagfairPriceService = container.resolve<RagfairPriceService>("RagfairPriceService");
        let pool = [];
        for (let p in (profiles || [])) {
            for (let wbk in profiles[p].userbuilds.weaponBuilds) {
                let wb = profiles[p].userbuilds.weaponBuilds[wbk];
                let preItems = wb.items;
                let id = preItems[0]._id;
                let tpl = preItems[0]._tpl;
                if (pool.includes(id)) {
                    continue;
                }
                pool.push(id)
                preItems[0] = {
                    "_id": id,
                    "_tpl": tpl,
                    "upd": {
							"Repairable": {
								"MaxDurability": 100,
								"Durability": 100
							},
							"FireMode": {
								"FireMode": "single"
							}
						}
                };
                let preItemsObj = jsonUtil.clone(preItems);
                for (let preItemObj of preItemsObj) {
                    assortTable.items.push(preItemObj);
                }
                let config;
                try {
                    config = require(`../config/config.json`);
                } catch (e) {
                }
                let price = (config || {}).cost || 7500;
                try {
                    price = RagfairPriceService.getDynamicOfferPriceForOffer(preItems,currency);
                } catch (error) {
                    
                }
                let offerRequire = [
                    {
                        "count": price,
                        "_tpl": currency
                    }
                ];
                assortTable.barter_scheme[id] = [offerRequire];
                assortTable.loyal_level_items[id] = 1;
            }
        };
        return assortTable;

    }

    private createAssortTable(container: DependencyContainer, sessionId?: string): ITraderAssort 
    {
        const importer = container.resolve("ImporterUtil");
        let assortTable: ITraderAssort = {
            //nextResupply: 3600,
            items: [],
            barter_scheme: {},
            loyal_level_items: {},
        }
        let currency = "5696686a4bdc2da3298b456a"
        let config;
        try {
            config = require(`../config/config.json`);
        } catch (e) {
        }

        let profiles = {};
        if (sessionId) {
            let t = container.resolve("ProfileHelper").getFullProfile(sessionId)
            profiles = { [sessionId]: t };
        } else {
            profiles = importer.loadRecursive('user/profiles/');
        }
        try {
            assortTable = this.getPresets(container, assortTable, (config || {}).currency || currency, profiles);
            console.log(assortTable)
        } catch (error) {
            console.error(error);
        };

        const MILK_ID = "575146b724597720a27126d5";
        const SICCP_ID = "5d235bb686f77443f4331278";
        const THWEAPON_ID = "5b6d9ce188a4501afc1b2b25";
        const THITEMCASE_ID = "5c0a840b86f7742ffa4f2482";
        const CASEITEM_ID = "59fb042886f7746c5005a7b2";
        const WEAPONCASE_ID = "59fb023c86f7746d0d4b423c";
        const MEDCASE_ID = "5aafbcd986f7745e590fff23";
        const MONEYCASE_ID = "59fb016586f7746d0d4b423a";
        const FOODCASE_ID = "5c093db286f7740a1b2617e3";
        const MAGBOX_ID = "5c127c4486f7745625356c13";
        const AMMOCASE_ID = "5aafbde786f774389d0cbc0f";
        const PACA_ID = "62a09d79de7ac81993580530";
        const patron_57x28_sb193_ID = "5cc80f67e4a949035e43bbba";
        const mag_57_fn_five_seven_std_57x28_20_ID = "5d3eb5eca4b9363b1f22f8e4";
        const mag_p90_fn_p90_std_57x28_50_ID = "5cc70093e4a949033c734312";
        const helmet_armasight_nvg_googles_mask_ID = "5c066ef40db834001966a595";
        const esmarch_id = "5e831507ea0a7c419c2f9bd9";
        const advil_id = "5af0548586f7743a532b7e99";
        const band_aid_id = "544fb25a4bdc2dfb738b4567";
        const splint_id = "544fb3364bdc2d34748b456a";
        const cms_id = "5d02778e86f774203e7dedbe";
        const car_first_aid_id = "590c661e86f7741e566b646a";
        const morphine_id = "544fb3f34bdc2d03748b456a";
        const btg_id = "5ed515c8d380ab312177c0fa";
        const ahf1m_id = "5ed515f6915ec335206e4152";
        const mule_id = "5ed51652f6c34d2cc26336a1";
        const p22_id = "5ed515ece452db0eb56fc028";
        const sj1_id = "5c0e531286f7747fa54205c2";
        const sj6_id = "5c0e531d86f7747fa23f4d42";
        const sj9_id = "5fca13ca637ee0341a484f46";
        const propital_id = "5c0e530286f7747fa1419862";
        const adrenaline_id = "5c10c8fd86f7743d7d706df3";
        const IFAK_id = "590c678286f77426c9660122";
        const CAT_ID = "60098af40accd37ef2175f27";
        const CALOK_ID = "5e8488fa988a8701445df1e4";
        const SURV12_id = "5d02797c86f774203f38e30a";
        const alumsplint_id = "5af0454c86f7746bf20992e8";
        const vaseline_id = "5755383e24597772cb798966";
        const goldstar_id = "5751a89d24597722aa0e8db0";
        const l1_id = "5ed515e03a40a50460332579";
        const etg_id = "5c0e534186f7747fa1419867";
        const zagustin_id = "5c0e533786f7747fa23f4d47";
        const meldonin_id = "5ed5160a87bb8443d10680b5";
        const obdolbos_id = "5ed5166ad380ab312177c100";
        const xtg12_id = "5fca138c2a7b221b2852a5c6";

        this.addSingleItemToAssortWithBarterScheme(assortTable, "GoblinsIfak", true, 999999999, 1, [ConfigJson.items.GoblinsIfak.map((value) => ({ _tpl: value.BarterItem, count: value.BarterPrice }))]);
        this.addSingleItemToAssortWithBarterScheme(assortTable, "GoblinsMedCase", true, 999999999, 2, [ConfigJson.items.AbuelasPillBox.map((value) => ({ _tpl: value.BarterItem, count: value.BarterPrice }))]);
        this.addSingleItemToAssortWithBarterScheme(assortTable, "GoblinsBoltHole", true, 999999999, 1, [ConfigJson.items.TiosChest.map((value) => ({ _tpl: value.BarterItem, count: value.BarterPrice }))]);
        this.addSingleItemToAssortWithBarterScheme(assortTable, "GoblinsBackpack", true, 999999999, 1, [ConfigJson.items.TreasureBag.map((value) => ({ _tpl: value.BarterItem, count: value.BarterPrice }))]);
        this.addSingleItemToAssortWithBarterScheme(assortTable, "lightningstim", true, 999999999, 2, [ConfigJson.items.AbuelosLightingJuice.map((value) => ({ _tpl: value.BarterItem, count: value.BarterPrice }))]);
        this.addSingleItemToAssortWithBarterScheme(assortTable, "ElDiablosBlood", true, 999999999, 3, [ConfigJson.items.ElDiablosBlood.map((value) => ({ _tpl: value.BarterItem, count: value.BarterPrice }))]);
        this.addSingleItemToAssortWithBarterScheme(assortTable, "AliceIllusionsTrophy001", true, 999999999, 3, [ConfigJson.items.RivalsGuise.map((value) => ({ _tpl: value.BarterItem, count: value.BarterPrice }))]);
        this.addSingleItemToAssortWithBarterScheme(assortTable, "AliceIllusionsTrophy002", true, 999999999, 3, [ConfigJson.items.A18MonkeySkin.map((value) => ({ _tpl: value.BarterItem, count: value.BarterPrice }))]);
        this.addSingleItemToAssortWithBarterScheme(assortTable, "DESOXYN", true, 999999999, 1, [ConfigJson.items.DESOXYN.map((value) => ({ _tpl: value.BarterItem, count: value.BarterPrice }))]);
        this.addSingleItemToAssortWithBarterScheme(assortTable, "556Sludge", true, 999999999, 1, [ConfigJson.items.SludgeAmmo.map((value) => ({ _tpl: value.BarterItem, count: value.BarterPrice }))]);
        this.addSingleItemToAssortWithBarterScheme(assortTable, "556SludgeBox", true, 999999999, 1, [ConfigJson.items.SludgeAmmoBox.map((value) => ({ _tpl: value.BarterItem, count: value.BarterPrice }))]);
        this.addSingleItemToAssortWithBarterScheme(assortTable, "CursedMask", true, 999999999, 4, [ConfigJson.items.CursedMask.map((value) => ({ _tpl: value.BarterItem, count: value.BarterPrice }))]);
        this.addSingleItemToAssortWithBarterScheme(assortTable, "GoblinsKACSR25", true, 999999999, 4, [ConfigJson.items.GoblinsKACSR25.map((value) => ({ _tpl: value.BarterItem, count: value.BarterPrice }))]);
        this.addSingleItemToAssortWithBarterScheme(assortTable, "c00lsh4d35", true, 999999999, 4, [ConfigJson.items.ReallyCoolShades.map((value) => ({ _tpl: value.BarterItem, count: value.BarterPrice }))]);
        this.addSingleItemToAssortWithBarterScheme(assortTable, "CastleTux", true, 999999999, 4, [ConfigJson.items.CastleTux.map((value) => ({ _tpl: value.BarterItem, count: value.BarterPrice }))]);
        this.addSingleItemToAssortWithBarterScheme(assortTable, "LegoHead", true, 999999999, 1, [ConfigJson.items.LegoHead.map((value) => ({ _tpl: value.BarterItem, count: value.BarterPrice }))]);
        this.addSingleItemToAssortWithBarterScheme(assortTable, "GCCerberus", true, 999999999, 4, [ConfigJson.items.GoblinCase.map((value) => ({ _tpl: value.BarterItem, count: value.BarterPrice }))]);
        this.addSingleItemToAssortWithBarterScheme(assortTable, "GCBeta1", true, 999999999, 1, [ConfigJson.items.GoblinGasMask.map((value) => ({ _tpl: value.BarterItem, count: value.BarterPrice }))]);
        this.addSingleItemToAssortWithBarterScheme(assortTable, "MickysTac", true, 999999999, 1, [ConfigJson.items.Lunchbox.map((value) => ({ _tpl: value.BarterItem, count: value.BarterPrice }))]);
        this.addSingleItemToAssortWithBarterScheme(assortTable, "BSGTheft", true, 999999999, 1, [ConfigJson.items.OMICRON.map((value) => ({ _tpl: value.BarterItem, count: value.BarterPrice }))]);
        this.addSingleItemToAssortWithBarterScheme(assortTable, "Prisonwallet", true, 999999999, 2, [ConfigJson.items.DooDooBox.map((value) => ({ _tpl: value.BarterItem, count: value.BarterPrice }))]);
        this.addSingleItemToAssortWithBarterScheme(assortTable, "Coyote", true, 999999999, 3, [ConfigJson.items.CoyoteBox.map((value) => ({ _tpl: value.BarterItem, count: value.BarterPrice }))]);
        this.addSingleItemToAssortWithBarterScheme(assortTable, "GoblinSec", true, 999999999, 3, [ConfigJson.items.GoblinBox.map((value) => ({ _tpl: value.BarterItem, count: value.BarterPrice }))]);
        this.addSingleItemToAssortWithBarterScheme(assortTable, "DHS", true, 999999999, 4, [ConfigJson.items.DHSLocker.map((value) => ({ _tpl: value.BarterItem, count: value.BarterPrice }))]);
        type SingleItemBarterScheme = { itemTpl: string; unlimitedCount: boolean; stackCount: number; loyaltyLevel: 1 | 2 | 3 | 4; currencyType: Money | string; currencyValue: number };
        const singleItemBarterSchemes: SingleItemBarterScheme[] = [
            { itemTpl: xtg12_id, unlimitedCount: false, stackCount: 10, loyaltyLevel: 1, currencyType: Money.ROUBLES, currencyValue: 20000 },
            { itemTpl: obdolbos_id, unlimitedCount: false, stackCount: 10, loyaltyLevel: 1, currencyType: Money.ROUBLES, currencyValue: 50000 },
            { itemTpl: meldonin_id, unlimitedCount: false, stackCount: 10, loyaltyLevel: 2, currencyType: Money.ROUBLES, currencyValue: 75000 },
            { itemTpl: zagustin_id, unlimitedCount: false, stackCount: 10, loyaltyLevel: 3, currencyType: Money.ROUBLES, currencyValue: 150000 },
            { itemTpl: etg_id, unlimitedCount: false, stackCount: 10, loyaltyLevel: 3, currencyType: Money.ROUBLES, currencyValue: 100000 },
            { itemTpl: l1_id, unlimitedCount: false, stackCount: 10, loyaltyLevel: 3, currencyType: Money.ROUBLES, currencyValue: 100000 },
            { itemTpl: SURV12_id, unlimitedCount: true, stackCount: 999999999, loyaltyLevel: 3, currencyType: Money.ROUBLES, currencyValue: 50000 },
            { itemTpl: CALOK_ID, unlimitedCount: true, stackCount: 999999999, loyaltyLevel: 3, currencyType: Money.ROUBLES, currencyValue: 17500 },
            { itemTpl: goldstar_id, unlimitedCount: true, stackCount: 999999999, loyaltyLevel: 3, currencyType: Money.ROUBLES, currencyValue: 17500 },
            { itemTpl: vaseline_id, unlimitedCount: true, stackCount: 999999999, loyaltyLevel: 2, currencyType: Money.ROUBLES, currencyValue: 11000 },
            { itemTpl: alumsplint_id, unlimitedCount: true, stackCount: 999999999, loyaltyLevel: 2, currencyType: Money.ROUBLES, currencyValue: 11000 },
            { itemTpl: CAT_ID, unlimitedCount: true, stackCount: 999999999, loyaltyLevel: 2, currencyType: Money.ROUBLES, currencyValue: 15000 },
            { itemTpl: IFAK_id, unlimitedCount: true, stackCount: 999999999, loyaltyLevel: 2, currencyType: Money.ROUBLES, currencyValue: 15000 },
            { itemTpl: sj9_id, unlimitedCount: false, stackCount: 5, loyaltyLevel: 1, currencyType: Money.ROUBLES, currencyValue: 125000 },
            { itemTpl: sj6_id, unlimitedCount: false, stackCount: 5, loyaltyLevel: 1, currencyType: Money.ROUBLES, currencyValue: 125000 },
            { itemTpl: sj1_id, unlimitedCount: false, stackCount: 10, loyaltyLevel: 2, currencyType: Money.ROUBLES, currencyValue: 125000 },
            { itemTpl: adrenaline_id, unlimitedCount: false, stackCount: 10, loyaltyLevel: 2, currencyType: Money.ROUBLES, currencyValue: 70000 },
            { itemTpl: propital_id, unlimitedCount: false, stackCount: 10, loyaltyLevel: 4, currencyType: Money.ROUBLES, currencyValue: 125000 },
            { itemTpl: p22_id, unlimitedCount: false, stackCount: 5, loyaltyLevel: 4, currencyType: Money.ROUBLES, currencyValue: 125000 },
            { itemTpl: mule_id, unlimitedCount: false, stackCount: 10, loyaltyLevel: 1, currencyType: Money.ROUBLES, currencyValue: 100000 },
            { itemTpl: ahf1m_id, unlimitedCount: false, stackCount: 10, loyaltyLevel: 2, currencyType: Money.ROUBLES, currencyValue: 90000 },
            { itemTpl: btg_id, unlimitedCount: true, stackCount: 999999999, loyaltyLevel: 3, currencyType: Money.ROUBLES, currencyValue: 100000 },
            { itemTpl: MILK_ID, unlimitedCount: true, stackCount: 999999999, loyaltyLevel: 1, currencyType: Money.ROUBLES, currencyValue: 12500 },
            { itemTpl: morphine_id, unlimitedCount: true, stackCount: 999999999, loyaltyLevel: 2, currencyType: Money.ROUBLES, currencyValue: 75000 },
            { itemTpl: esmarch_id, unlimitedCount: true, stackCount: 999999999, loyaltyLevel: 1, currencyType: Money.ROUBLES, currencyValue: 10000 },
            { itemTpl: advil_id, unlimitedCount: true, stackCount: 999999999, loyaltyLevel: 1, currencyType: Money.ROUBLES, currencyValue: 25000 },
            { itemTpl: band_aid_id, unlimitedCount: true, stackCount: 999999999, loyaltyLevel: 1, currencyType: Money.ROUBLES, currencyValue: 7500 },
            { itemTpl: splint_id, unlimitedCount: true, stackCount: 999999999, loyaltyLevel: 1, currencyType: Money.ROUBLES, currencyValue: 8500 },
            { itemTpl: cms_id, unlimitedCount: true, stackCount: 999999999, loyaltyLevel: 1, currencyType: Money.ROUBLES, currencyValue: 24500 },
            { itemTpl: car_first_aid_id, unlimitedCount: true, stackCount: 999999999, loyaltyLevel: 1, currencyType: Money.ROUBLES, currencyValue: 20000 },
            { itemTpl: SICCP_ID, unlimitedCount: false, stackCount: 1, loyaltyLevel: 1, currencyType: Money.EUROS, currencyValue: 6000 },
            { itemTpl: THWEAPON_ID, unlimitedCount: false, stackCount: 1, loyaltyLevel: 1, currencyType: Money.EUROS, currencyValue: 25000 },
            { itemTpl: WEAPONCASE_ID, unlimitedCount: false, stackCount: 1, loyaltyLevel: 1, currencyType: Money.ROUBLES, currencyValue: 1100000 },
            { itemTpl: THITEMCASE_ID, unlimitedCount: false, stackCount: 1, loyaltyLevel: 1, currencyType: Money.DOLLARS, currencyValue: 40000 },
            { itemTpl: CASEITEM_ID, unlimitedCount: false, stackCount: 1, loyaltyLevel: 1, currencyType: Money.DOLLARS, currencyValue: 15000 },
            { itemTpl: MEDCASE_ID, unlimitedCount: false, stackCount: 2, loyaltyLevel: 1, currencyType: Money.ROUBLES, currencyValue: 300000 },
            { itemTpl: MONEYCASE_ID, unlimitedCount: false, stackCount: 2, loyaltyLevel: 1, currencyType: Money.DOLLARS, currencyValue: 2700 },
            { itemTpl: FOODCASE_ID, unlimitedCount: false, stackCount: 2, loyaltyLevel: 1, currencyType: Money.ROUBLES, currencyValue: 320000 },
            { itemTpl: MAGBOX_ID, unlimitedCount: false, stackCount: 3, loyaltyLevel: 1, currencyType: Money.EUROS, currencyValue: 2000 },
            { itemTpl: AMMOCASE_ID, unlimitedCount: false, stackCount: 4, loyaltyLevel: 1, currencyType: Money.DOLLARS, currencyValue: 1500 },
            { itemTpl: PACA_ID, unlimitedCount: false, stackCount: 1, loyaltyLevel: 2, currencyType: Money.DOLLARS, currencyValue: 1000 },
            { itemTpl: patron_57x28_sb193_ID, unlimitedCount: true, stackCount: 1, loyaltyLevel: 2, currencyType: Money.DOLLARS, currencyValue: 25 },
            { itemTpl: mag_57_fn_five_seven_std_57x28_20_ID, unlimitedCount: false, stackCount: 1, loyaltyLevel: 2, currencyType: Money.DOLLARS, currencyValue: 400 },
            { itemTpl: mag_p90_fn_p90_std_57x28_50_ID, unlimitedCount: false, stackCount: 1, loyaltyLevel: 2, currencyType: Money.DOLLARS, currencyValue: 500 },
            { itemTpl: helmet_armasight_nvg_googles_mask_ID, unlimitedCount: false, stackCount: 1, loyaltyLevel: 2, currencyType: Money.DOLLARS, currencyValue: 300 },
            { itemTpl: "5c94bbff86f7747ee735c08f", unlimitedCount: true, stackCount: 999999999, loyaltyLevel: 3, currencyType: Money.DOLLARS, currencyValue: 100 },

        ];
        singleItemBarterSchemes.forEach((singleItemBarterScheme: SingleItemBarterScheme) =>
            this.addSingleItemToAssort(
                assortTable,
                singleItemBarterScheme.itemTpl,
                singleItemBarterScheme.unlimitedCount,
                singleItemBarterScheme.stackCount,
                singleItemBarterScheme.loyaltyLevel,
                singleItemBarterScheme.currencyType,
                singleItemBarterScheme.currencyValue
            )
        );

        return assortTable;
    }
    private loadMyDB(container: DependencyContainer) 
    {
        const databaseImporter: ImporterUtil = container.resolve<ImporterUtil>("ImporterUtil");
        const preAkiModLoader = container.resolve<PreAkiModLoader>("PreAkiModLoader");

        this.mydb = databaseImporter.loadRecursive(`${preAkiModLoader.getModPath(this.modName)}db/`);
    }


    private addTraderToDb(container: DependencyContainer): void 
    {
        const databaseServer: DatabaseServer = container.resolve<DatabaseServer>("DatabaseServer");
        const databaseTables: IDatabaseTables = databaseServer.getTables();

        databaseTables.traders[AliceIllusionJson._id] = {
            assort: this.createAssortTable(container),
            base: JSON.parse(JSON.stringify({ ...AliceIllusionJson, unlockedByDefault: !ConfigJson.settings.UnlockGoblinAfterCollector })) as ITraderBase,
            questassort: JSON.parse(JSON.stringify(QuestAssortJson))
        };

    }

    private addTraderToLocales(container: DependencyContainer, fullName: string, firstName: string, nickName: string, location: string, description: string): void 
    {
        const databaseServer: DatabaseServer = container.resolve<DatabaseServer>("DatabaseServer");
        const databaseTables: IDatabaseTables = databaseServer.getTables();
        const locales: Record<string, Record<string, string>> = databaseTables.locales.global;

        for (const locale in locales) 
        {
            locales[locale][`${AliceIllusionJson._id} FullName`] = fullName;
            locales[locale][`${AliceIllusionJson._id} FirstName`] = firstName;
            locales[locale][`${AliceIllusionJson._id} Nickname`] = nickName;
            locales[locale][`${AliceIllusionJson._id} Location`] = location;
            locales[locale][`${AliceIllusionJson._id} Description`] = description;
        }
    }

    private addTraderToFleaMarket(container: DependencyContainer) 
    {
        const configServer: ConfigServer = container.resolve<ConfigServer>("ConfigServer");
        const ragfairConfig: IRagfairConfig = configServer.getConfig(ConfigTypes.RAGFAIR);
        ragfairConfig.traders[AliceIllusionJson._id] = true;
    }

    private addItemsToDb(container: DependencyContainer) 
    {
        const databaseServer: DatabaseServer = container.resolve<DatabaseServer>("DatabaseServer");
        const databaseTables: IDatabaseTables = databaseServer.getTables();

        if (ConfigJson.settings.RebalanceItemsForMoreRealism) this.rebalanceItemsForMoreRealism();

        for (const item in this.mydb.templates.items.items.templates) 
        {
            databaseTables.templates.items[item] = this.mydb.templates.items.items.templates[item];
        }
    }

    private rebalanceItemsForMoreRealism() 
    {
        this.mydb.templates.items.items.templates["CursedMask"]._props.CanRequireOnRagfair = false;
        this.mydb.templates.items.items.templates["CursedMask"]._props.CanSellOnRagfair = false;

        this.mydb.templates.items.items.templates["GoblinsIfak"]._props.effects_health.Energy.value = 25;
        this.mydb.templates.items.items.templates["GoblinsIfak"]._props.hpResourceRate = 0;
        this.mydb.templates.items.items.templates["GoblinsIfak"]._props.MaxHpResource = 15;
        this.mydb.templates.items.items.templates["GoblinsIfak"]._props.Rarity = "SuperRare";

        this.logger.log(`[${this.modName}] Items rebalanced for more realism`, LogTextColor.BLUE);
    }

    private addItemsToLocales(container: DependencyContainer): void 
    {
        const databaseServer: DatabaseServer = container.resolve<DatabaseServer>("DatabaseServer");
        const databaseTables: IDatabaseTables = databaseServer.getTables();
        const locales: Record<string, Record<string, string>> = databaseTables.locales.global;
        const types: Record<string, Record<string, string>> = databaseTables.bots.types;
        

        locales.en = {
            ...locales.en,
            ...this.mydb.locales.en
        };
        locales.ge = {
            ...locales.ge,
            ...this.mydb.locales.ge
        };
        locales.ru = {
            ...locales.ru,
            ...this.mydb.locales.ru
        };
        types.usec = {
            ...types.usec,
            ...this.mydb.locales.usec
        },
        types.bear = {
            ...types.bear,
            ...this.mydb.locales.bear
        },
        types.exusec = {
            ...types.exusec,
            ...this.mydb.locales.exusec
        };
        }

    

    private addHandbookToDb(container: DependencyContainer) 
    {
        const databaseServer: DatabaseServer = container.resolve<DatabaseServer>("DatabaseServer");
        const databaseTables: IDatabaseTables = databaseServer.getTables();

        for (const handbook of this.mydb.templates.handbook.Items) 
        {
            if (!databaseTables.templates.handbook.Items.find((i) => i.Id == handbook.Id)) databaseTables.templates.handbook.Items.push(handbook);
        }
    }

    private addBuffsToDb(container: DependencyContainer) 
    {
        const databaseServer: DatabaseServer = container.resolve<DatabaseServer>("DatabaseServer");
        const databaseTables: IDatabaseTables = databaseServer.getTables();

        const buffs = databaseTables.globals.config.Health.Effects.Stimulator.Buffs;
        const myBuffs = this.mydb.globals.config.Health.Effects.Stimulator.Buffs;
        for (const buff in myBuffs) 
        {
            buffs[buff] = myBuffs[buff];
        }
    }
}
module.exports = { mod: new AliceIllusion() };
