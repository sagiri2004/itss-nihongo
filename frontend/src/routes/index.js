import {
  Authentication,
  HomePage,
  Settings,
  Classrooms,
  Classroom,
  FlashCardPage,
  EditFlashcardPage,
  MessengerPage,
  MyFlashcardSetPage,
  AboutPage,
  AdminPage,
  ResetPassword,
} from "~/pages";
import Default from "~/layouts/Default";
import DefaultWithScrollbar from "~/layouts/DefaultWithScrollbar";
import config from "~/config";

const publicRoutes = [
  {
    path: config.routes.home,
    component: HomePage,
    layout: Default,
  },
  { path: config.routes.login, component: Authentication, layout: null },
  { path: config.routes.signup, component: Authentication, layout: null },
  {
    path: config.routes.about,
    component: AboutPage,
    layout: null,
  },
  {
    path: config.routes.settings,
    component: Settings,
    layout: DefaultWithScrollbar,
  },
  { path: config.routes.classrooms, component: Classrooms, layout: Default },
  { path: config.routes.classroom, component: Classroom, layout: Default },
  { path: config.routes.assignments, component: Classroom, layout: Default },
  {
    path: config.routes.assignmentDetail,
    component: Classroom,
    layout: Default,
  },
  {
    path: config.routes.classroomAdmin,
    component: Classroom,
    layout: Default,
  },
  {
    path: config.routes.flashCards,
    component: FlashCardPage,
    layout: DefaultWithScrollbar,
  },
  {
    path: config.routes.edit,
    component: EditFlashcardPage,
    layout: DefaultWithScrollbar,
  },
  {
    path: config.routes.myFlashcardSets,
    component: MyFlashcardSetPage,
    layout: DefaultWithScrollbar,
  },
  {
    path: config.routes.messenger,
    component: MessengerPage,
    layout: Default,
  },
  {
    path: config.routes.admin,
    component: AdminPage,
    layout: null,
  },
  {
    path: config.routes.resetPassword,
    component: ResetPassword,
    layout: null,
  },
];

const privateRoutes = [];

export { publicRoutes, privateRoutes };
