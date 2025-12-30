import PropTypes from 'prop-types';
import itemUtil from "../../ItemUtil.jsx";
import "./ItemStack.css"
import {useEffect, useState, useMemo, useCallback} from "react";
import httpUtil from "../../HttpUtil.jsx";
import { BuildOutlined, InfoCircleOutlined } from '@ant-design/icons';

const ITEM_STACK_TYPE = {
    FLUID: "fluid",
    ITEM: "item",
    ASPECT: "aspect"
}

function ItemIcon({
    srcList,
    alt,
    title
}) {
    const [srcIdx, setSrcIdx] = useState(0)
    // Reset index when srcList changes (e.g. item changes)
    useEffect(() => {
        setSrcIdx(0);
    }, [srcList]);

    const src = useMemo(() => {
        return srcList[srcIdx]
    }, [srcList, srcIdx])
    
    const handleError = useCallback(event => {
        setSrcIdx(old => {
            return Math.min(old + 1, srcList.length - 1)
        })
    }, [srcList]);
    
    return (
        <img src={src} onError={handleError} alt={alt} title={title} />
    )
}

function ItemStack({itemStack = null, onCraftRequest, onShowInfo}) {
    // Fallback for null itemStack
    const effectiveItemStack = itemStack || {"name": "Air", "label": "空气", "size": 0};

    // Determine type
    const type = useMemo(() => {
        if (effectiveItemStack.aspect) return ITEM_STACK_TYPE.ASPECT;
        if (effectiveItemStack.amount) {
            if (effectiveItemStack.name && effectiveItemStack.name.endsWith("essentia")) {
                return ITEM_STACK_TYPE.ASPECT;
            }
            return ITEM_STACK_TYPE.FLUID;
        }
        return ITEM_STACK_TYPE.ITEM;
    }, [effectiveItemStack]);

    // Parse aspect name if needed
    const aspectName = useMemo(() => {
        if (type === ITEM_STACK_TYPE.ASPECT && effectiveItemStack.name && effectiveItemStack.name.endsWith("essentia")) {
            return effectiveItemStack.name.substring(7, effectiveItemStack.name.indexOf("essentia"));
        }
        return effectiveItemStack.aspect;
    }, [type, effectiveItemStack]);

    // Handle fluid/gas amount vs item size
    const size = effectiveItemStack.amount || effectiveItemStack.size;

    // Local state for fetched item details
    const [itemDetails, setItemDetails] = useState({"name": "Air", "tr": "空气", "tab": "建筑", "type": "Block", "maxStackSize": 64, "maxDurability": 1});
    
    // Fetch item details when itemStack changes
    useEffect(() => {
        let isMounted = true;
        
        let url = "database/" + type + "/"
        let damage = effectiveItemStack.damage;

        switch (type) {
            case ITEM_STACK_TYPE.ITEM:
                url += effectiveItemStack.name.toLowerCase().replaceAll(":", ".") + "." + damage + ".json"
                break;
            case ITEM_STACK_TYPE.ASPECT:
                url += (aspectName || "").toLowerCase() + ".json"
                break;
            case ITEM_STACK_TYPE.FLUID:
                url += effectiveItemStack.name.toString() + ".json"
                break;
        }

        httpUtil.doAction(url, "GET")
            .then(async res => {
                if (!isMounted) return;
                
                if (await res.status !== 404) {
                    const target = await res.json()
                    if (type === ITEM_STACK_TYPE.ASPECT) {
                        target.localizedName = target.description
                    }

                    if (effectiveItemStack.name === "ae2fc:fluid_drop") {
                        target.localizedName = target.localizedName.substring(3)
                        target.localizedName = effectiveItemStack.label.replaceAll("drop of", "").replaceAll("液滴", "") + " " + target.localizedName
                        target.tooltip = target.localizedName
                    }

                    setItemDetails(target)
                } else {
                    // Fallback logic if needed, e.g. try meta 0
                     if (type === ITEM_STACK_TYPE.ITEM && damage !== 0) {
                        // Could retry with damage 0 here if desired, 
                        // but original code logic was a bit mixed.
                        // For now we just keep default or previous valid state? 
                        // Better to reset to basic info to avoid showing wrong image from previous item.
                        setItemDetails(prev => ({...prev, imageFilePath: undefined})); 
                    }
                }
            }).catch(err => {
                console.error("Failed to fetch item details", err);
            })
            
        return () => { isMounted = false; };
    }, [type, effectiveItemStack.name, effectiveItemStack.damage, effectiveItemStack.label, aspectName]);

    const itemLocalizedName = itemDetails.localizedName || effectiveItemStack.label || effectiveItemStack.name;

    // Calculate display amount
    let displayAmount = "";
    if (size > 1e9) {
        displayAmount = parseInt(size / 1e7 + "") / 100.0 + "G"
    } else if (size > 1e6) {
        displayAmount = parseInt(size / 1e4 + "") / 100.0 + "M"
    } else if (size > 1e3) {
        displayAmount = parseInt(size / 1e1 + "") / 100.0 + "K"
    } else {
        displayAmount = size
    }
    if (effectiveItemStack.amount) {
        displayAmount += "L"
    }

    // Construct full object for callbacks
    const fullObject = useMemo(() => {
        const obj = JSON.parse(JSON.stringify(effectiveItemStack));
        if (aspectName) obj.aspect = aspectName;
        obj.size = size;
        return obj;
    }, [effectiveItemStack, aspectName, size]);

    return (
        <div className={"itemStack"}>
            <div className={"item-stack-tool-bar"}>
                <span className={"item-stack-tool-bar-item item-stack-tool-bar-info"} 
                      title={"查看额外信息"}
                      onClick={(e) => {
                          e.stopPropagation();
                          if (onShowInfo) onShowInfo(fullObject, itemDetails);
                      }}> 
                      <InfoCircleOutlined style={{ fontSize: '14px' }} />
                </span>
                {effectiveItemStack.isCraftable ? 
                    <span className={"item-stack-tool-bar-item item-stack-craftable"} 
                          title={"请求制造"}
                          onClick={(e) => {
                              e.stopPropagation();
                              if (onCraftRequest) onCraftRequest(fullObject);
                          }}>
                          <BuildOutlined style={{ fontSize: '14px' }} />
                    </span> : <></>}
            </div>

            <div className="itemIcon">
                <ItemIcon srcList={[
                    itemUtil.getIcon(itemDetails.imageFilePath),
                    itemUtil.getIcon((itemDetails.imageFilePath || "").replace("~" + itemDetails.maxDamage, "~0")),
                    itemUtil.getIcon(undefined)
                ]} alt={itemDetails.localizedName} title={itemDetails.tooltip}></ItemIcon>
            </div>
            
            <span className={"item-stack-amount"}>
                <span>x</span>
                <span title={size}>{displayAmount}</span>
            </span>

            <span className={"itemInfoMainName"} title={itemLocalizedName}>{itemLocalizedName}</span>
            <span className={"itemInfoSubName"} title={effectiveItemStack.label}>{effectiveItemStack.label}</span>
            
            <div className={"itemInfo"}>
                <div className={"itemInfoLine"}>
                    <span>ID:</span>
                    <span title={effectiveItemStack.name}>{effectiveItemStack.name}</span>
                </div>
                {effectiveItemStack.damage !== undefined ? (
                    <div className={"itemInfoLine"}>
                        <span>Meta:</span>
                        <span>{effectiveItemStack.damage}</span>
                    </div>
                ) : null}
            </div>
        </div>
    )
}

ItemStack.propTypes = {
    itemStack: PropTypes.object,
    onCraftRequest: PropTypes.func,
    onShowInfo: PropTypes.func
}

export default ItemStack