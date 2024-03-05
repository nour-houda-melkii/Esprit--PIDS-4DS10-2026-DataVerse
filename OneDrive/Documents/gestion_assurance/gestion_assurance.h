#ifndef GESTION_ASSURANCE_H
#define GESTION_ASSURANCE_H

#include <QMainWindow>

QT_BEGIN_NAMESPACE
namespace Ui { class gestion_assurance; }
QT_END_NAMESPACE

class gestion_assurance : public QMainWindow
{
    Q_OBJECT

public:
    gestion_assurance(QWidget *parent = nullptr);
    ~gestion_assurance();

private:
    Ui::gestion_assurance *ui;
};
#endif // GESTION_ASSURANCE_H
