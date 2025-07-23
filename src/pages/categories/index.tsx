import {
  DashboardDescription,
  DashboardHeader,
  DashboardLayout,
  DashboardTitle,
} from "@/components/layouts/DashboardLayout";
import { CategoryCatalogCard } from "@/components/shared/category/CategoryCatalogCard";
import { CategoryForm } from "@/components/shared/category/CategoryForm";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { categoryFormSchema, type CategoryFormSchema } from "@/forms/category";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactElement } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { NextPageWithLayout } from "../_app";
import { api } from "@/utils/api";
import { toast } from "sonner";

const CategoriesPage: NextPageWithLayout = () => {
  const apiUtils = api.useUtils();

  const [createCategoryDialogOpen, setCreateCategoryDialogOpen] =
    useState(false);
  const [editCategoryDialogOpen, setEditCategoryDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [categoryToEdit, setCategoryToEdit] = useState<string | null>(null);

  // FORMS =============================================
  const createCategoryForm = useForm<CategoryFormSchema>({
    resolver: zodResolver(categoryFormSchema),
  });

  // 1. Fields mirip, condition beda
  // CreateForm
  // name: string, min 3, wajib diisi
  // price: number, min 1000, wajib diisi

  // EditForm
  // name: string, optional
  // price: number, optional

  // 2. Atur form values secara independent (create dan edit)

  const editCategoryForm = useForm<CategoryFormSchema>({
    resolver: zodResolver(categoryFormSchema),
  });

  // Queries and Mutations =============================================
  const { data: categories } = api.category.getCategories.useQuery();

  const { mutate: createCategory } = api.category.createCategory.useMutation({
    onSuccess: async () => {
      await apiUtils.category.getCategories.invalidate();

      toast("Successfully created a new category");
      setCreateCategoryDialogOpen(false);
      createCategoryForm.reset();
    },
  });

  const { mutate: deleteCategoryById } =
    api.category.deleteCategoryById.useMutation({
      onSuccess: async () => {
        await apiUtils.category.getCategories.invalidate();

        toast("Successfully deleted a category");
        setCategoryToDelete(null);
      },
    });

  const { mutate: editCategory } = api.category.editCategory.useMutation({
    onSuccess: async () => {
      await apiUtils.category.getCategories.invalidate();

      toast("Successfully edited a category");
      editCategoryForm.reset();
      setCategoryToEdit(null);
      setEditCategoryDialogOpen(false);
    },
  });

  // Handlers =============================================
  const handleSubmitCreateCategory = (data: CategoryFormSchema) => {
    createCategory({
      name: data.name,
    });
  };

  const handleSubmitEditCategory = (data: CategoryFormSchema) => {
    if (!categoryToEdit) return;

    editCategory({
      name: data.name,
      categoryId: categoryToEdit,
    });
  };

  const handleClickEditCategory = (category: { id: string; name: string }) => {
    setEditCategoryDialogOpen(true);
    setCategoryToEdit(category.id);

    editCategoryForm.reset({
      name: category.name,
    });
  };

  const handleClickDeleteCategory = (categoryId: string) => {
    setCategoryToDelete(categoryId);
  };

  const handleConfirmDeleteCategory = () => {
    if (!categoryToDelete) return;

    deleteCategoryById({
      categoryId: categoryToDelete,
    });
  };

  return (
    <>
      <DashboardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <DashboardTitle>Category Management</DashboardTitle>
            <DashboardDescription>
              Organize your products with custom categories.
            </DashboardDescription>
          </div>

          <AlertDialog
            open={createCategoryDialogOpen}
            onOpenChange={setCreateCategoryDialogOpen}
          >
            <AlertDialogTrigger asChild>
              <Button>Add New Category</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Add New Category</AlertDialogTitle>
              </AlertDialogHeader>

              {/* <Form {...createCategoryForm}> */}
                <CategoryForm
                  onSubmit={handleSubmitCreateCategory}
                  form={createCategoryForm}
                />
              {/* </Form> */}

              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button
                  onClick={createCategoryForm.handleSubmit(
                    handleSubmitCreateCategory,
                  )}
                >
                  Create Category
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DashboardHeader>

      <div className="grid grid-cols-4 gap-4">
        {categories?.map((category) => {
          return (
            <CategoryCatalogCard
              key={category.id}
              name={category.name}
              productCount={category._count?.products || 0}
              onDelete={() => handleClickDeleteCategory(category.id)}
              onEdit={() =>
                handleClickEditCategory({
                  id: category.id,
                  name: category.name,
                })
              }
            />
          );
        })}
      </div>

      <AlertDialog
        open={editCategoryDialogOpen}
        onOpenChange={setEditCategoryDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Category</AlertDialogTitle>
          </AlertDialogHeader>

          {/* <Form {...editCategoryForm}> */}
            <CategoryForm
              onSubmit={handleSubmitEditCategory}
              form={editCategoryForm}
            />
          {/* </Form> */}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              onClick={editCategoryForm.handleSubmit(handleSubmitEditCategory)}
            >
              Edit Category
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!categoryToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setCategoryToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            Are you sure you want to delete this category? This action cannot be
            undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleConfirmDeleteCategory}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

CategoriesPage.getLayout = (page: ReactElement) => {
  return <DashboardLayout>{page}</DashboardLayout>;
};

export default CategoriesPage;
