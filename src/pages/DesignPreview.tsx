import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import Layout from "@/components/Layout";
import { t } from "@/i18n/t";

export default function DesignPreview() {
  return (
    <Layout>
      <div className="mx-auto flex max-w-3xl flex-col gap-8 py-8">
        <h1 className="text-2xl font-semibold">Design Preview</h1>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Tabs (shadcn, Base UI)</h2>
          <Card>
            <CardContent className="pt-4">
              <Tabs defaultValue="list">
                <TabsList>
                  <TabsTrigger value="list">{t("views.list")}</TabsTrigger>
                  <TabsTrigger value="board">{t("views.board")}</TabsTrigger>
                  <TabsTrigger value="gantt">{t("views.gantt")}</TabsTrigger>
                </TabsList>
                <TabsContent value="list">
                  <p className="text-text-muted p-4">{t("views.placeholder")}</p>
                </TabsContent>
                <TabsContent value="board">
                  <p className="text-text-muted p-4">{t("views.placeholder")}</p>
                </TabsContent>
                <TabsContent value="gantt">
                  <p className="text-text-muted p-4">{t("views.placeholder")}</p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Buttons (4 variants x 2 sizes)</h2>
          <Card>
            <CardContent className="flex flex-col gap-4 pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button>主要操作</Button>
                <Button variant="outline">次要操作</Button>
                <Button variant="ghost">幽灵按钮</Button>
                <Button variant="destructive">危险操作</Button>
                <Button disabled>禁用</Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">主要操作</Button>
                <Button size="sm" variant="outline">次要操作</Button>
                <Button size="sm" variant="ghost">幽灵按钮</Button>
                <Button size="sm" variant="destructive">危险操作</Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Cards</h2>
          <div className="grid grid-cols-3 gap-4">
            <Card hoverable>
              <CardContent className="pt-4">
                <p className="text-base">默认卡片 (hover 阴影)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>卡片标题</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-muted">内容区域</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>数据卡片</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <div className="h-2 w-full rounded-sm bg-border" />
                  <div className="h-2 w-3/4 rounded-sm bg-border" />
                  <div className="h-2 w-1/2 rounded-sm bg-border" />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Typography</h2>
          <Card>
            <CardContent className="flex flex-col gap-2 pt-4">
              <p className="text-xs text-text-muted">text-xs 12px 提示文字</p>
              <p className="text-sm text-text-muted">text-sm 14px 次要正文</p>
              <p className="text-base">text-base 16px 正文</p>
              <p className="text-lg font-medium">text-lg 18px 强调正文</p>
              <p className="text-xl font-medium">text-xl 20px 小标题</p>
              <p className="text-2xl font-semibold">text-2xl 24px 页面标题</p>
              <p className="text-3xl font-semibold">text-3xl 30px 主标题</p>
            </CardContent>
          </Card>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">占位视图</h2>
          <Card>
            <CardContent className="pt-4">
              <p className="text-text-muted">{t("views.placeholder")}</p>
            </CardContent>
          </Card>
        </section>
      </div>
    </Layout>
  );
}
