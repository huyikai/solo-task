import Button from "@/components/Button";
import Card from "@/components/Card";
import Layout from "@/components/Layout";
import ViewTabs from "@/components/ViewTabs";
import { t } from "@/i18n/t";

export default function DesignPreview() {
  return (
    <Layout>
      <div className="mx-auto flex max-w-3xl flex-col gap-8 py-8">
        <h1 className="text-2xl font-semibold">Design Preview</h1>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">ViewTabs</h2>
          <Card>
            <ViewTabs active="list" onChange={() => {}} />
          </Card>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Buttons (4 variants x 2 sizes)</h2>
          <Card className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" size="md">
                主要操作
              </Button>
              <Button variant="secondary" size="md">
                次要操作
              </Button>
              <Button variant="ghost" size="md">
                幽灵按钮
              </Button>
              <Button variant="danger" size="md">
                危险操作
              </Button>
              <Button variant="primary" size="md" loading>
                加载中
              </Button>
              <Button variant="secondary" size="md" disabled>
                禁用
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" size="sm">
                主要操作
              </Button>
              <Button variant="secondary" size="sm">
                次要操作
              </Button>
              <Button variant="ghost" size="sm">
                幽灵按钮
              </Button>
              <Button variant="danger" size="sm">
                危险操作
              </Button>
            </div>
          </Card>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Cards</h2>
          <div className="grid grid-cols-3 gap-4">
            <Card hoverable>
              <p className="text-base">默认卡片 (hover 阴影)</p>
            </Card>
            <Card title="卡片标题" subtitle="副标题文字">
              <p className="text-sm text-text-muted">内容区域</p>
            </Card>
            <Card title="数据卡片">
              <div className="flex flex-col gap-2">
                <div className="h-2 w-full rounded-sm bg-border" />
                <div className="h-2 w-3/4 rounded-sm bg-border" />
                <div className="h-2 w-1/2 rounded-sm bg-border" />
              </div>
            </Card>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Typography</h2>
          <Card className="flex flex-col gap-2">
            <p className="text-xs text-text-muted">text-xs 12px 提示文字</p>
            <p className="text-sm text-text-muted">text-sm 14px 次要正文</p>
            <p className="text-base">text-base 16px 正文</p>
            <p className="text-lg font-medium">text-lg 18px 强调正文</p>
            <p className="text-xl font-medium">text-xl 20px 小标题</p>
            <p className="text-2xl font-semibold">text-2xl 24px 页面标题</p>
            <p className="text-3xl font-semibold">text-3xl 30px 主标题</p>
          </Card>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">占位视图</h2>
          <Card>
            <p className="text-text-muted">{t("views.placeholder")}</p>
          </Card>
        </section>
      </div>
    </Layout>
  );
}
