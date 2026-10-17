-- SQL_STORED_PROCEDURE dbo.Ddtc_AutoExport_Sto (modified 2012-04-21T07:53:24.450)






-- 导出记事本文件
/*
作    者:Xiaov
创建时间:2009-05-22
描    述:由SqlServer系统自动生成昨天&今天两天的数据，目前数据生成包括
        1、用户购买物品数量
        2、用户购买物品金额

*/
CREATE PROCEDURE [dbo].[Ddtc_AutoExport_Sto] 
@Op_Date DateTime
AS
BEGIN

/*第一步：定义基本属性*/
Declare @ApplicationId Varchar(10)   --定义所属代理商
Declare @SubId Varchar(10)           --定义所属渠道 
Declare @Current DateTime           --定义当前时间
Declare @FileType Varchar(40)       --定义生成的文件名
Declare @ExecSql Varchar(1000)      --定义查询语句
Declare @Sa  Varchar(100)           --定义访问用户名
Declare @Password Varchar(100)      --定义访问密码

/*第二步：初始化变量*/
Set @Current=@Op_Date                            --设置查询时间
SELECT Top 1  @ApplicationId=ApplicationId,@SubId=Subid
       FROM Count_Application_Sub                                 --获取当前游戏类型、代理商
Set @Sa='Sa'
Set @Password='123456'


/*第三步:生成物品数量*/
Set @FileType='GmItemData-'+ right('0'+@ApplicationId,2)+right('0'+@SubId,2)+'01-'+Replace(Convert(Char(10),@Current,120),'-','')+'.log'
Select @ExecSql=' bcp "select '+@ApplicationId+','+@SubId+',* from Db_Count.dbo.Count_ItemDataLog"    queryout D:\GameLog\'+@FileType+'  -c -t , -U'+@Sa+' -P'+@Password
Exec   master..xp_cmdshell @ExecSql


/*第四步：生成物品金额*/
Set @FileType='GmItemMoney-'+ right('0'+@ApplicationId,2)+right('0'+@SubId,2)+'01-'+Replace(Convert(Char(10),@Current,120),'-','')+'.log'
Select @ExecSql=' bcp "select '+@ApplicationId+','+@SubId+',* from Db_Count.dbo.Count_ItemMoneyLog"    queryout D:\GameLog\'+@FileType+'  -c -t , -U'+@Sa+' -P'+@Password
Exec   master..xp_cmdshell @ExecSql



 
END







GO
