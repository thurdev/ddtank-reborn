-- SQL_STORED_PROCEDURE dbo.Mem_Code_Sto (modified 2012-04-21T07:54:31.110)



CREATE     PROCEDURE Mem_Code_Sto  
 @code varchar(50), 
 @ouototal varchar(50)='' output AS  
/*
作者：小危 创建时间:2008-9-25 修改人：小危 修改时间：2008-9-25 
描述:获取当前最大值生成是有序的
*/

/*定义变量*/
declare @oldid bigint  /*以前最大值*/
declare @newid bigint  /*现在最大值*/

/*第一步：得到之前最大值*/
select  @oldid=codenumber   from Mem_Code where code= @code 
if @oldid<0 
  begin 
    INSERT INTO Mem_Code(code,codenumber) VALUES (@code,0)
    set @oldid=0
  end
/*第二步:把最大值加一*/
set @newid=1+@oldid


/*第三步：给返回值附值*/

   set  @ouototal=@newid


/*第四步：更新当前最大值*/
update Mem_Code set codenumber=@ouototal  where code=@code
GO
