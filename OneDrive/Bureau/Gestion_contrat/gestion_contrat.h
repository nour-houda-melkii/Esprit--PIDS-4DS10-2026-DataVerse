#ifndef GESTION_CONTRAT_H
#define GESTION_CONTRAT_H

#include <QMainWindow>

QT_BEGIN_NAMESPACE
namespace Ui { class gestion_contrat; }
QT_END_NAMESPACE

class gestion_contrat : public QMainWindow
{
    Q_OBJECT

public:
    gestion_contrat(QWidget *parent = nullptr);
    ~gestion_contrat();

private:
    Ui::gestion_contrat *ui;
};
#endif // GESTION_CONTRAT_H
