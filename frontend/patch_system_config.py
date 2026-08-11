import os

path = "C:/Users/hp/knust-library/frontend/src/components/admin/config/SystemConfig.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the interface
content = content.replace(
    "maxFineAmount: number;",
    "maxFineAmount: number;\n  lostBookDaysThreshold: number;\n  lostBookFee: number;"
)

# 2. Add UI for the two settings. Let's find a good place.
# We'll put it after Fine Configuration.
target = """<div className="text-[10px] text-rose-400 font-bold uppercase">Max Fine Amount</div>
                        <div className="relative group">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium group-focus-within:text-indigo-600 transition-colors">GH₵</span>
                          <input 
                            type="number"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all hover:bg-white"
                            defaultValue={settings.maxFineAmount}
                            onBlur={e => updateSettingsMutation.mutate({ maxFineAmount: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                    </div>"""

replacement = """<div className="text-[10px] text-rose-400 font-bold uppercase">Max Fine Amount</div>
                        <div className="relative group">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium group-focus-within:text-indigo-600 transition-colors">GH₵</span>
                          <input 
                            type="number"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all hover:bg-white"
                            defaultValue={settings.maxFineAmount}
                            onBlur={e => updateSettingsMutation.mutate({ maxFineAmount: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] text-rose-400 font-bold uppercase">Lost Book Threshold (Days)</div>
                        <input 
                          type="number"
                          className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all hover:bg-white mt-1"
                          defaultValue={settings.lostBookDaysThreshold}
                          onBlur={e => updateSettingsMutation.mutate({ lostBookDaysThreshold: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <div className="text-[10px] text-rose-400 font-bold uppercase">Lost Book Replacement Fee</div>
                        <div className="relative group mt-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium group-focus-within:text-indigo-600 transition-colors">GH₵</span>
                          <input 
                            type="number"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all hover:bg-white"
                            defaultValue={settings.lostBookFee}
                            onBlur={e => updateSettingsMutation.mutate({ lostBookFee: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                    </div>"""

content = content.replace(target, replacement)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("SystemConfig.tsx updated")
