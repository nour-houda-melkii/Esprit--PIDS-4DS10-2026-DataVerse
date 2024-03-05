#include "assurances.h"

assurances::assurances(QString type, float prix, int id_assurances  )

{
  this->id_assurances=id_assurances;
    this->type=type;
    this ->prix=prix;
}
bool assurances::ajouter()
{
    QSqlQuery query;
    QString res = QString ::number(id_assurances);

    query .prepare("insert into assurances (id_assurances, prix, tyes" "values (:id_assurances, :prix, :type)");
    query . bindValue(":id_assurances",res);
    query.bindValue(":type",type);
    query .bindValue(":prix",prix);
    return query .exec();

}

QSqlQueryModel *assurances::afficher ()
{
QSqlQueryModel * model=new QSqlQueryModel();

model->setQuery("select * from assurances");

model->setHeaderData(0,Qt::Horizontal,QObject::tr("ID"));
model->setHeaderData(1,Qt::Horizontal,QObject::tr("type"));
model->setHeaderData(2,Qt::Horizontal,QObject::tr("prix"));
return model;


}

bool assurances ::supprimer (int id_assurances )
{
   QSqlQuery query;
   QString res=QString::number(id_assurances );
   query . prepare("delete from etudiant where  ID= :id");
   query .bindValue(" :id",res);
   return query .exec();
}
