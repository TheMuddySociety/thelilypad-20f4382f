import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Ban,
  Link2,
  ArrowRight,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { Layer, Trait } from "./LayerManager";

export type RuleType = "incompatible" | "requires" | "forces";

export interface TraitRule {
  id: string;
  type: RuleType;
  sourceLayerId: string;
  sourceTraitId: string;
  targetLayerId: string;
  targetTraitId: string;
}

interface TraitRulesManagerProps {
  layers: Layer[];
  rules: TraitRule[];
  onRulesChange: (rules: TraitRule[]) => void;
}

const ruleTypeInfo: Record<
  RuleType,
  { label: string; icon: React.ElementType; color: string; description: string }
> = {
  incompatible: {
    label: "Incompatible With",
    icon: Ban,
    color: "text-red-500",
    description: "These traits cannot appear together",
  },
  requires: {
    label: "Requires",
    icon: Link2,
    color: "text-blue-500",
    description: "Source trait requires target trait to be present",
  },
  forces: {
    label: "Forces",
    icon: Zap,
    color: "text-yellow-500",
    description: "Source trait always forces target trait to appear",
  },
};

export function TraitRulesManager({
  layers,
  rules,
  onRulesChange,
}: TraitRulesManagerProps) {
  const [newRule, setNewRule] = useState<Partial<TraitRule>>({
    type: "incompatible",
  });

  const addRule = () => {
    if (
      !newRule.type ||
      !newRule.sourceLayerId ||
      !newRule.sourceTraitId ||
      !newRule.targetLayerId ||
      !newRule.targetTraitId
    ) {
      return;
    }

    const rule: TraitRule = {
      id: crypto.randomUUID(),
      type: newRule.type as RuleType,
      sourceLayerId: newRule.sourceLayerId,
      sourceTraitId: newRule.sourceTraitId,
      targetLayerId: newRule.targetLayerId,
      targetTraitId: newRule.targetTraitId,
    };

    onRulesChange([...rules, rule]);
    setNewRule({ type: "incompatible" });
  };

  const removeRule = (ruleId: string) => {
    onRulesChange(rules.filter((r) => r.id !== ruleId));
  };

  const getLayerName = (layerId: string) => {
    return layers.find((l) => l.id === layerId)?.name || "Unknown Layer";
  };

  const getTraitName = (layerId: string, traitId: string) => {
    const layer = layers.find((l) => l.id === layerId);
    return layer?.traits.find((t) => t.id === traitId)?.name || "Unknown Trait";
  };

  const getTraitsForLayer = (layerId: string): Trait[] => {
    return layers.find((l) => l.id === layerId)?.traits || [];
  };

  const sourceTraits = newRule.sourceLayerId
    ? getTraitsForLayer(newRule.sourceLayerId)
    : [];
  const targetTraits = newRule.targetLayerId
    ? getTraitsForLayer(newRule.targetLayerId)
    : [];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Advanced Trait Rules
        </h3>
        <p className="text-sm text-muted-foreground">
          Define incompatibilities, requirements, and forced combinations
        </p>
      </div>

      {/* Add New Rule */}
      <Card className="border-dashed">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Add New Rule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Rule Type Selection */}
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(ruleTypeInfo) as RuleType[]).map((type) => {
              const info = ruleTypeInfo[type];
              const Icon = info.icon;
              return (
                <button
                  key={type}
                  onClick={() => setNewRule({ ...newRule, type })}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    newRule.type === type
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-1 ${info.color}`} />
                  <p className="text-xs font-medium">{info.label}</p>
                </button>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            {newRule.type && ruleTypeInfo[newRule.type as RuleType].description}
          </p>

          {/* Source Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Source Layer</Label>
              <Select
                value={newRule.sourceLayerId}
                onValueChange={(value) =>
                  setNewRule({
                    ...newRule,
                    sourceLayerId: value,
                    sourceTraitId: undefined,
                  })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select layer" />
                </SelectTrigger>
                <SelectContent>
                  {layers.map((layer) => (
                    <SelectItem key={layer.id} value={layer.id}>
                      {layer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Source Trait</Label>
              <Select
                value={newRule.sourceTraitId}
                onValueChange={(value) =>
                  setNewRule({ ...newRule, sourceTraitId: value })
                }
                disabled={!newRule.sourceLayerId}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select trait" />
                </SelectTrigger>
                <SelectContent>
                  {sourceTraits.map((trait) => (
                    <SelectItem key={trait.id} value={trait.id}>
                      {trait.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>

          {/* Target Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Target Layer</Label>
              <Select
                value={newRule.targetLayerId}
                onValueChange={(value) =>
                  setNewRule({
                    ...newRule,
                    targetLayerId: value,
                    targetTraitId: undefined,
                  })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select layer" />
                </SelectTrigger>
                <SelectContent>
                  {layers.map((layer) => (
                    <SelectItem key={layer.id} value={layer.id}>
                      {layer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Target Trait</Label>
              <Select
                value={newRule.targetTraitId}
                onValueChange={(value) =>
                  setNewRule({ ...newRule, targetTraitId: value })
                }
                disabled={!newRule.targetLayerId}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select trait" />
                </SelectTrigger>
                <SelectContent>
                  {targetTraits.map((trait) => (
                    <SelectItem key={trait.id} value={trait.id}>
                      {trait.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={addRule}
            disabled={
              !newRule.type ||
              !newRule.sourceLayerId ||
              !newRule.sourceTraitId ||
              !newRule.targetLayerId ||
              !newRule.targetTraitId
            }
            className="w-full"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Rule
          </Button>
        </CardContent>
      </Card>

      {/* Existing Rules */}
      <div className="space-y-2">
        <Label className="text-sm">Active Rules ({rules.length})</Label>
        <ScrollArea className="h-[200px]">
          {rules.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg">
              No rules defined yet
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => {
                const info = ruleTypeInfo[rule.type];
                const Icon = info.icon;
                return (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${info.color}`} />
                      <div className="text-sm">
                        <span className="font-medium">
                          {getTraitName(rule.sourceLayerId, rule.sourceTraitId)}
                        </span>
                        <span className="text-muted-foreground mx-2">
                          ({getLayerName(rule.sourceLayerId)})
                        </span>
                        <Badge variant="outline" className="mx-2 text-xs">
                          {info.label.toLowerCase()}
                        </Badge>
                        <span className="font-medium">
                          {getTraitName(rule.targetLayerId, rule.targetTraitId)}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          ({getLayerName(rule.targetLayerId)})
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeRule(rule.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
