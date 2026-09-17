import Card from "@/components/Card";
import { t } from "@/i18n/t";

export default function ListView() {
  return (
    <Card>
      <p className="text-text-muted">{t("views.placeholder")}</p>
    </Card>
  );
}
