import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/i18n/t";

export default function ListView() {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-text-muted">{t("views.placeholder")}</p>
      </CardContent>
    </Card>
  );
}
