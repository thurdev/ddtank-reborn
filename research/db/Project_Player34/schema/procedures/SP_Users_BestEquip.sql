-- SQL_STORED_PROCEDURE dbo.SP_Users_BestEquip (modified 2021-06-04T05:18:36.053)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：获取用户最好装备>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Users_BestEquip]
as
return
/*暂停
select  Sys_Users_Detail.UserName,Sys_Users_Detail.NickName,Sys_Users_Detail.Grade,Sys_Users_Detail.Sex,Sys_Users_Detail.GP,Shop_Goods.Name,Sys_Users_Goods.Strengthenlevel,Sys_Users_Goods.RemoveDate
 from Sys_Users_Goods 
left join Sys_Users_Detail on
Sys_Users_Goods.UserID=Sys_Users_Detail.UserID
left Join Shop_Goods on
Sys_Users_Goods.TemplateID=Shop_Goods.TemplateID
where Sys_Users_Goods.UserID>0 and Sys_Users_Goods.TemplateID in(7015,7016,7017,7018,7019,7020,7021,7022,7023)
and CONVERT(varchar(20),dateadd(dd,1,RemoveDate),101)=CONVERT(varchar(20),getdate(),101)*/







GO
