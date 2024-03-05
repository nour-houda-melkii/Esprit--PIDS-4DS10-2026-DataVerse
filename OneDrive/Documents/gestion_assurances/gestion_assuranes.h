#ifndef GESTION_ASSURANES_H
#define GESTION_ASSURANES_H

#include <QMainWindow>

QT_BEGIN_NAMESPACE
namespace Ui { class gestion_assuranes; }
QT_END_NAMESPACE

class gestion_assuranes : public QMainWindow
{
    Q_OBJECT

public:
    gestion_assuranes(QWidget *parent = nullptr);
    ~gestion_assuranes();

private:
    Ui::gestion_assuranes *ui;
};
#endif // GESTION_ASSURANES_H
