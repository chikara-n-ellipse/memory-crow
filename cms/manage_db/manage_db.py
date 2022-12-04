from cms.models import Project, ProjectLearningManagement,Tag, Card, QA, ReviewManagement

def manage_db():
    pass
    # for qa in QA.objects.iterator():
    #     if qa.rm_set.count()==0:
    #         print(qa.card.id)
    #         print(qa.question_field)
    #         print(qa.rm_set.all())
    #         input()
    #         qa.delete()
    # print("QA", QA.objects.all().first().id)

def create_default_plms():
    cnt = 0
    for project in Project.objects.iterator():
        plm = ProjectLearningManagement.objects.filter(user=project.user, project=project).first()
        if not plm:
            plm = ProjectLearningManagement()
            plm.project = project
            plm.user = project.user
            plm.save()
            cnt += 1
    print(cnt)

def inspect_plms(project_id):
    project = Project.objects.filter(id=project_id).first()
    plm = ProjectLearningManagement.objects.filter(project=project).first()
    print(plm)