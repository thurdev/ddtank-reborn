-- SQL_SCALAR_FUNCTION dbo.f_Int2IP (modified 2025-11-03T04:46:08.190)

/*--数字   IP   转换成格式化   IP   地址   
    
  --邹建   2004.08(引用请保留此信息)--*/   
    
  /*--调用示例   
    
  select   dbo.f_Int2IP(3232235531)   
  select   dbo.f_Int2IP(212336641)   
  --*/   
  CREATE   FUNCTION   f_Int2IP(   
  @IP   bigint   
  )RETURNS   varchar(15)   
  AS   
  BEGIN   
  DECLARE   @re   varchar(15)   
  SET   @re=''   
  SELECT   @re=@re+'.'+CAST(@IP/ID   as   varchar)   
  ,@IP=@IP%ID   
  from(   
  SELECT   ID=CAST(16777216   as   bigint)   
  UNION   ALL   SELECT   65536   
  UNION   ALL   SELECT   256   
  UNION   ALL   SELECT   1)a   
  RETURN(STUFF(@re,1,1,''))   
  END   

GO
