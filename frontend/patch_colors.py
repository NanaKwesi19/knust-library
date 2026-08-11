import os

path = "C:/Users/hp/knust-library/frontend/src/components/admin/config/SystemConfig.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-orange-400 font-bold uppercase">Lost Book Threshold (Days)</div>
                    <div className="text-2xl font-black text-orange-600 mt-1">{settings.lostBookDaysThreshold ?? 90}</div>
                  </div>
                  <input
                    type="number"
                    step="1"
                    defaultValue={settings.lostBookDaysThreshold ?? 90}
                    onBlur={e => updateSettingsMutation.mutate({ lostBookDaysThreshold: Number(e.target.value) })}
                    min={1}
                    max={365}
                    className={`${numberClass} border-orange-200`}
                  />
                </div>
              </div>
              <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-orange-400 font-bold uppercase">Lost Book Replacement Fee</div>
                    <div className="text-2xl font-black text-orange-600 mt-1">GH₵{(settings.lostBookFee ?? 150).toFixed(2)}</div>
                  </div>
                  <input
                    type="number"
                    step="5"
                    defaultValue={settings.lostBookFee ?? 150}
                    onBlur={e => updateSettingsMutation.mutate({ lostBookFee: Number(e.target.value) })}
                    min={0}
                    max={1000}
                    className={`${numberClass} border-orange-200`}
                  />
                </div>
              </div>
            </div>"""

replacement = target.replace("orange", "rose")
content = content.replace(target, replacement)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("SystemConfig colors updated")
